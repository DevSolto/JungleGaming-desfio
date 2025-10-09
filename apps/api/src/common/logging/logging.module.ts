import { Global, Module, Logger } from '@nestjs/common';
import { AppLoggerService, createAppLogger } from '@repo/logger';
import { LoggingInterceptor } from './logging.interceptor';
import { RequestContextMiddleware } from './request-context.middleware';

@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () => createAppLogger(),
    },
    {
      provide: Logger,
      useExisting: AppLoggerService,
    },
    LoggingInterceptor,
    RequestContextMiddleware,
  ],
  exports: [
    AppLoggerService,
    Logger,
    LoggingInterceptor,
    RequestContextMiddleware,
  ],
})
export class LoggingModule {}
