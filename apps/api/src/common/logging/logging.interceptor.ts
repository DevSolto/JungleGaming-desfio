import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { AppLoggerService, getCurrentRequestContext } from '@repo/logger';
import { maskBody, maskHeaders } from './mask.util';

const HR_TIME_IN_MS = 1_000_000n;

const getDurationInMs = (start: bigint): number => {
  const end = process.hrtime.bigint();
  return Number(end - start) / Number(HR_TIME_IN_MS);
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const method = request.method;
    const url = request.originalUrl ?? request.url;
    const contextLogger = this.logger.withContext({ method, url });

    const headers = maskHeaders(request.headers);
    const body = maskBody(request.body);

    contextLogger.debug('HTTP request started', {
      headers,
      body,
      requestContext: getCurrentRequestContext(),
    });

    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const duration = getDurationInMs(start);
        const statusCode = response.statusCode;
        const requestContext = getCurrentRequestContext();

        contextLogger.log('HTTP request completed', {
          statusCode,
          duration,
          requestContext,
        });
      }),
      catchError((error: unknown) => {
        const duration = getDurationInMs(start);
        const statusCode = response.statusCode;
        const requestContext = getCurrentRequestContext();

        contextLogger.error('HTTP request failed', error, {
          statusCode,
          duration,
          requestContext,
        });

        return throwError(() => error);
      }),
    );
  }
}
