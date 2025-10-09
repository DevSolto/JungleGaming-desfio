import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import type {
  NotificationListFilters,
  PaginatedNotifications,
} from '@repo/types';
import {
  NOTIFICATIONS_MESSAGE_PATTERNS,
  type NotificationsFindAllPayload,
  type NotificationsMessagePattern,
  NOTIFICATIONS_RPC_CLIENT,
} from './notifications.constants';

export type ListNotificationsFilters = NotificationListFilters;
export type PaginatedNotificationResult = PaginatedNotifications;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_RPC_CLIENT)
    private readonly client: ClientProxy,
  ) {}

  async findAll(
    recipientId: string,
    filters: ListNotificationsFilters = {},
  ): Promise<PaginatedNotificationResult> {
    const payload: NotificationsFindAllPayload = {
      recipientId,
      ...filters,
    };

    return this.send<PaginatedNotificationResult>(
      NOTIFICATIONS_MESSAGE_PATTERNS.FIND_ALL,
      payload,
    );
  }

  private async send<TResponse>(
    pattern: NotificationsMessagePattern,
    payload: unknown,
  ): Promise<TResponse> {
    try {
      this.logger.debug(`📤 Sending RPC request (pattern=${pattern})`);
      return await lastValueFrom(this.client.send<TResponse>(pattern, payload));
    } catch (error) {
      throw this.toHttpException(error);
    } finally {
      this.logger.debug(`📥 Completed RPC request (pattern=${pattern})`);
    }
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
