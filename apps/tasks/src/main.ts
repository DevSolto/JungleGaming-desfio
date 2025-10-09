import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import {
  resolveWaitForDatabaseOptions,
  waitForDatabase,
} from './database/wait-for-database';

import { AppModule } from './app.module';
import { AppLoggerService, createAppLogger } from '@repo/logger';
import { RpcContextInterceptor } from './common/logging/rpc-context.interceptor';

async function bootstrap() {
  const bootstrapLogger = createAppLogger({ name: 'tasks-service' }).withContext({
    service: 'tasks-service',
    context: 'bootstrap',
  });
  const configService = new ConfigService();

  const databaseUrl = configService.get<string>('DATABASE_URL');
  if (databaseUrl && databaseUrl.trim().length > 0) {
    try {
      const options = resolveWaitForDatabaseOptions(process.env, databaseUrl);
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

  const rabbitMqUrl = configService.get<string>(
    'RABBITMQ_URL',
    'amqp://admin:admin@localhost:5672',
  );
  const queue = configService.get<string>('RABBITMQ_QUEUE', 'tasks.rpc');
  const prefetchRaw = configService.get<string>('RABBITMQ_PREFETCH', '10');
  const prefetch = Number.isNaN(Number(prefetchRaw))
    ? 10
    : Number(prefetchRaw);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      bufferLogs: true,
      transport: Transport.RMQ,
      options: {
        urls: [rabbitMqUrl],
        queue,
        queueOptions: {
          durable: true,
        },
        prefetchCount: prefetch,
      },
    },
  );

  const appLogger = app.get(AppLoggerService).withContext({
    service: 'tasks-service',
    context: 'rmq-microservice',
  });
  const rpcContextInterceptor = app.get(RpcContextInterceptor);

  app.useLogger(appLogger);
  app.useGlobalInterceptors(rpcContextInterceptor);

  await app.listen();
  appLogger.log('Tasks microservice connected to RabbitMQ queue.', {
    rabbitMqUrl,
    queue,
    prefetch,
  });
}

void bootstrap();
