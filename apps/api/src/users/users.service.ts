import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ClientProxy,
  RpcException,
  RmqRecord,
  RmqRecordBuilder,
} from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { getCurrentRequestContext } from '@repo/logger';
import type { CorrelatedMessage, UserDTO, UserListFilters } from '@repo/types';

import {
  USERS_MESSAGE_PATTERNS,
  type UsersMessagePattern,
  USERS_RPC_CLIENT,
} from './users.constants';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_RPC_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async findAll(filters: UserListFilters = {}): Promise<UserDTO[]> {
    const payload = this.addRequestId(filters);
    return this.send<UserDTO[], UserListFilters>(
      USERS_MESSAGE_PATTERNS.FIND_ALL,
      payload,
    );
  }

  async findById(id: string): Promise<UserDTO> {
    const payload = this.addRequestId({ id });
    return this.send<UserDTO, { id: string }>(
      USERS_MESSAGE_PATTERNS.FIND_BY_ID,
      payload,
    );
  }

  private async send<TResponse, TPayload extends object>(
    pattern: UsersMessagePattern,
    payload: CorrelatedMessage<TPayload>,
  ): Promise<TResponse> {
    try {
      const record = this.createRecord(payload);
      return await lastValueFrom(this.client.send<TResponse>(pattern, record));
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private createRecord<TPayload extends object>(
    payload: CorrelatedMessage<TPayload>,
  ): RmqRecord<CorrelatedMessage<TPayload>> {
    const builder = new RmqRecordBuilder<CorrelatedMessage<TPayload>>(payload);

    if (payload.requestId) {
      builder.setOptions({
        headers: {
          'x-request-id': payload.requestId,
        },
      });
    }

    return builder.build();
  }

  private addRequestId<TPayload extends object>(
    payload: TPayload,
  ): CorrelatedMessage<TPayload> {
    const requestId = getCurrentRequestContext()?.requestId;

    if (!requestId) {
      return payload as CorrelatedMessage<TPayload>;
    }

    return {
      ...payload,
      requestId,
    } satisfies CorrelatedMessage<TPayload>;
  }

  private toHttpException(error: unknown): HttpException {
    if (error instanceof RpcException) {
      const normalized = this.normalizeRpcException(error);
      if (normalized) {
        return this.createHttpException(
          normalized.body,
          normalized.statusCode,
          normalized.cause,
        );
      }
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      !(error instanceof Error)
    ) {
      const obj = error as Record<string, unknown>;

      if (
        'message' in obj ||
        'status' in obj ||
        'statusCode' in obj ||
        'error' in obj ||
        'code' in obj
      ) {
        const body = this.normalizeBody({
          ...obj,
        });
        const statusCode = this.extractStatusCode(
          body.statusCode ?? body.status,
        );
        return this.createHttpException(body, statusCode, error);
      }
    }

    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof Error) {
      return this.createHttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message ?? 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    return this.createHttpException(
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private normalizeRpcException(error: RpcException): {
    body: Record<string, unknown>;
    statusCode: HttpStatus;
    cause?: unknown;
  } | null {
    const errorResponse = error.getError();

    if (errorResponse instanceof HttpException) {
      return {
        body: this.normalizeBody(errorResponse.getResponse()),
        statusCode: errorResponse.getStatus(),
        cause: error,
      };
    }

    if (typeof errorResponse !== 'object' || errorResponse === null) {
      return null;
    }

    const statusCode = this.extractStatusCode(
      (errorResponse as { statusCode?: unknown }).statusCode,
    );
    const body = this.normalizeBody(errorResponse);

    return {
      body,
      statusCode,
      cause: error,
    };
  }

  private normalizeBody(response: unknown): Record<string, unknown> {
    if (response instanceof HttpException) {
      return this.normalizeBody(response.getResponse());
    }

    if (typeof response === 'string') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: response,
      };
    }

    if (typeof response === 'object' && response !== null) {
      return response as Record<string, unknown>;
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }

  private extractStatusCode(value: unknown): HttpStatus {
    if (typeof value === 'number' && value in HttpStatus) {
      return value as HttpStatus;
    }

    if (typeof value === 'string') {
      const numeric = Number.parseInt(value, 10);
      if (!Number.isNaN(numeric) && numeric in HttpStatus) {
        return numeric as HttpStatus;
      }
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private createHttpException(
    body: Record<string, unknown>,
    statusCode: HttpStatus,
    cause?: unknown,
  ): HttpException {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return new BadRequestException(body, { cause });
      case HttpStatus.UNAUTHORIZED:
        return new UnauthorizedException(body, { cause });
      case HttpStatus.FORBIDDEN:
        return new ForbiddenException(body, { cause });
      case HttpStatus.NOT_FOUND:
        return new NotFoundException(body, { cause });
      case HttpStatus.CONFLICT:
        return new ConflictException(body, { cause });
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return new UnprocessableEntityException(body, { cause });
      default:
        return new HttpException(body, statusCode, { cause });
    }
  }
}
