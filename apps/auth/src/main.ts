import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { AppLoggerService, createAppLogger } from '@repo/logger';
import { RpcContextInterceptor } from './common/logging/rpc-context.interceptor';
import { resolveWaitForDatabaseOptions, waitForDatabase } from './database/wait-for-database';

async function bootstrap() {
  const bootstrapLogger = createAppLogger({ name: 'auth-service' }).withContext({
    service: 'auth-service',
    context: 'bootstrap',
  });
  const port = Number(process.env.AUTH_SERVICE_PORT ?? process.env.PORT ?? 4010);
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    const options = resolveWaitForDatabaseOptions(process.env, databaseUrl);

    try {
      await waitForDatabase(
        options,
        bootstrapLogger.withContext({ context: 'wait-for-database' }),
      );
    } catch (error) {
      bootstrapLogger.error(
        'Failed to establish an initial connection to PostgreSQL. Aborting startup.',
        error,
        { stage: 'database-initialization' },
      );
      throw error;
    }
  } else {
    bootstrapLogger.warn(
      'DATABASE_URL is not defined. Skipping PostgreSQL availability checks.',
      { stage: 'database-initialization' },
    );
  }

  const tcpApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    bufferLogs: true,
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  const appLogger = tcpApp.get(AppLoggerService).withContext({
    service: 'auth-service',
    context: 'tcp-microservice',
  });
  const rpcContextInterceptor = tcpApp.get(RpcContextInterceptor);

  tcpApp.useLogger(appLogger);
  tcpApp.useGlobalInterceptors(rpcContextInterceptor);

  await tcpApp.listen();
  appLogger.log('Auth microservice is listening on TCP port.', {
    port,
    transport: 'tcp',
  });
}
bootstrap();
