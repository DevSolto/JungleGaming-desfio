import type { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import type { Request, Response } from 'express';

import { LoggingInterceptor } from './logging.interceptor';
import type { AppLoggerService } from '@repo/logger';

jest.mock('@repo/logger', () => {
  const maskValue = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(maskValue);
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, current]) => {
        const normalized = key.toLowerCase();
        if (
          normalized.includes('password') ||
          normalized.includes('token') ||
          normalized.includes('authorization') ||
          normalized.includes('cookie')
        ) {
          acc[key] = '[REDACTED]';
          return acc;
        }

        acc[key] = maskValue(current);
        return acc;
      }, {});
    }

    return value;
  };

  return {
    maskSensitiveFields: jest.fn((value: unknown) => maskValue(value)),
    getCurrentRequestContext: jest.fn(() => undefined),
    AppLoggerService: class {},
  };
});

describe('LoggingInterceptor', () => {
  const createExecutionContext = (request: Request, response: Response) => ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }) as unknown as ExecutionContext;

  it('sanitiza headers e body antes de registrar os logs', async () => {
    const debug = jest.fn();
    const log = jest.fn();
    const error = jest.fn();

    const contextLogger = {
      debug,
      log,
      error,
      withContext: jest.fn().mockReturnThis(),
    };

    const logger = {
      withContext: jest.fn(() => contextLogger),
    } as unknown as AppLoggerService;

    const interceptor = new LoggingInterceptor(logger);

    const request = {
      method: 'POST',
      originalUrl: '/auth/login',
      headers: {
        authorization: 'Bearer token-valor',
        cookie: 'refresh=valor',
      },
      body: {
        password: 'senha-super-secreta',
        refreshToken: 'refresh-valor',
        nested: {
          token: 'valor-token',
        },
      },
    } as unknown as Request;

    const response = {
      statusCode: 200,
    } as Response;

    const context = createExecutionContext(request, response);

    await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of(null),
      }),
    );

    expect(logger.withContext).toHaveBeenCalledWith({ method: 'POST', url: '/auth/login' });
    expect(debug).toHaveBeenCalledTimes(1);

    const [, debugContext] = debug.mock.calls[0];

    expect(debugContext.headers).toEqual({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
    });
    expect(debugContext.body).toEqual({
      password: '[REDACTED]',
      refreshToken: '[REDACTED]',
      nested: { token: '[REDACTED]' },
    });

    expect(request.body.password).toBe('senha-super-secreta');
    expect(request.headers.authorization).toBe('Bearer token-valor');

    expect(log).toHaveBeenCalledWith('HTTP request completed', expect.any(Object));
    expect(error).not.toHaveBeenCalled();
  });
});
