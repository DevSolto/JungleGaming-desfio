import { Global, Module, Logger } from '@nestjs/common';

import { AppLoggerService, createAppLogger } from '@repo/logger';

import { RpcContextInterceptor } from './rpc-context.interceptor';

@Global()
@Module({
  providers: [
    {
      provide: AppLoggerService,
      useFactory: () =>
        createAppLogger({ name: 'auth-service' }).withContext({ service: 'auth-service' }),
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
