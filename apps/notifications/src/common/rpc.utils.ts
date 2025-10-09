import { BadRequestException, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';

export function transformPayload<T extends ClassConstructor<object>>(
  cls: T,
  payload: unknown,
): InstanceType<T> {
  const dto = plainToInstance(cls, payload as object, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(dto as object, {
    whitelist: true,
    forbidUnknownValues: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }

  return dto as InstanceType<T>;
}

export function toRpcException(error: unknown): RpcException {
  if (error instanceof RpcException) {
    return error;
  }

  if (error instanceof HttpException) {
    const status = error.getStatus();
    const response = error.getResponse();

    if (typeof response === 'object' && response !== null) {
      const payload = response as Record<string, unknown>;
      const statusCodeCandidate = payload['statusCode'];
      const statusCode =
        typeof statusCodeCandidate === 'number'
          ? statusCodeCandidate
          : typeof statusCodeCandidate === 'string'
            ? Number.parseInt(statusCodeCandidate, 10) || status
            : status;

      return new RpcException({
        statusCode,
        ...payload,
      });
    }

    return new RpcException({
      statusCode: status,
      message: response,
    });
  }

  if (error instanceof Error) {
    return new RpcException({
      message: error.message,
    });
  }

  return new RpcException(error as Record<string, unknown>);
}
