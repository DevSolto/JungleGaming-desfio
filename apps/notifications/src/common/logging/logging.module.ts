import { Global, Module, Logger } from '@nestjs/common';

import { AppLoggerService, createAppLogger } from '@repo/logger';

import { RpcContextInterceptor } from './rpc-context.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () =>
        createAppLogger({ name: 'notifications-service' }).withContext({
          service: 'notifications-service',
        }),
    },
    {
      provide: Logger,
      useExisting: AppLoggerService,
    },
    RpcContextInterceptor,
  ],
  exports: [AppLoggerService, Logger, RpcContextInterceptor],
})
export class LoggingModule {}
