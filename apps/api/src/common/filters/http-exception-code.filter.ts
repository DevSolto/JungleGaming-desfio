import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionCodeFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const baseBody: Record<string, unknown> =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : { ...((exceptionResponse ?? {}) as Record<string, unknown>) };

    const code = this.extractCode(baseBody, exception.cause);

    const body: Record<string, unknown> = {
      statusCode: status,
      ...baseBody,
    };

    if (code) {
      body.code = code;
    }

    if (typeof body.statusCode !== 'number') {
      body.statusCode = status;
    }

    response.status(status).json(body);
  }

  private extractCode(
    baseBody: Record<string, unknown>,
    cause?: unknown,
  ): string | undefined {
    if (typeof baseBody.code === 'string') {
      return baseBody.code;
    }

    if (
      cause &&
      typeof cause === 'object' &&
      'code' in (cause as Record<string, unknown>) &&
      typeof (cause as Record<string, unknown>).code === 'string'
    ) {
      return (cause as Record<string, string>).code;
    }

    return undefined;
  }
}
