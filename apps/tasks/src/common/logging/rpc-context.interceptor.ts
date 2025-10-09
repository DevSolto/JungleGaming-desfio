import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Injectable, NestInterceptor } from '@nestjs/common';
import type { RmqContext } from '@nestjs/microservices';
import type { Observable } from 'rxjs';

import { runWithRequestContext, type RequestContext } from '@repo/logger';

const REQUEST_ID_HEADER = 'x-request-id';

const extractRequestContext = (message: unknown): RequestContext | undefined => {
  if (
    !message ||
    typeof message !== 'object' ||
    !('properties' in message) ||
    typeof (message as { properties?: unknown }).properties !== 'object'
  ) {
    return undefined;
  }

  const properties = (message as {
    properties?: {
      headers?: Record<string, unknown>;
      correlationId?: unknown;
      messageId?: unknown;
    };
  }).properties;

  if (!properties) {
    return undefined;
  }

  const headers = properties.headers ?? {};
  const requestIdCandidate = headers[REQUEST_ID_HEADER] ?? headers['request-id'];
  const correlationIdCandidate = properties.correlationId ?? headers['x-correlation-id'];
  const messageIdCandidate = properties.messageId;

  const requestContext: RequestContext = {};

  if (typeof requestIdCandidate === 'string' && requestIdCandidate.trim().length > 0) {
    requestContext.requestId = requestIdCandidate;
  }

  if (typeof correlationIdCandidate === 'string' && correlationIdCandidate.trim().length > 0) {
    requestContext.correlationId = correlationIdCandidate;
  }

  if (typeof messageIdCandidate === 'string' && messageIdCandidate.trim().length > 0) {
    requestContext.messageId = messageIdCandidate;
  }

  return Object.keys(requestContext).length > 0 ? requestContext : undefined;
};

@Injectable()
export class RpcContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = context.getType();
    if (contextType !== 'rpc') {
      return next.handle();
    }

    const rmqContext = context.switchToRpc().getContext<RmqContext>();
    const message = rmqContext?.getMessage?.();
    const requestContext = extractRequestContext(message);

    if (!requestContext) {
      return next.handle();
    }

    return runWithRequestContext(requestContext, () => next.handle());
  }
}
