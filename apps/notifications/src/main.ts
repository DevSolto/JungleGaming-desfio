import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import {
  COMMENT_NEW_EVENT,
  NOTIFICATIONS_GATEWAY_QUEUE,
  NOTIFICATIONS_SERVICE_QUEUE,
  TASK_UPDATED_EVENT,
} from './notifications.constants';

/**
 * Messaging topology shared with the API Gateway:
 * - Notifications service consumes domain events from `NOTIFICATIONS_SERVICE_QUEUE`.
 * - Forwarded WebSocket events are published to `NOTIFICATIONS_GATEWAY_QUEUE`
 *   using the `COMMENT_NEW_EVENT` and `TASK_UPDATED_EVENT` topics.
 */
async function bootstrap() {
  const logger = new Logger('NotificationsBootstrap');
  const configService = new ConfigService();

  const rabbitMqUrl = configService.get<string>(
    'RABBITMQ_URL',
    'amqp://admin:admin@localhost:5672',
  );
  const queue = configService.get<string>(
    'RABBITMQ_QUEUE',
    NOTIFICATIONS_SERVICE_QUEUE,
  );
  const prefetchRaw = configService.get<string>('RABBITMQ_PREFETCH', '10');
  const prefetch = Number.isNaN(Number(prefetchRaw))
    ? 10
    : Number(prefetchRaw);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
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

  await app.listen();
  logger.log(
    `Notifications microservice connected to ${rabbitMqUrl} on queue "${queue}" (prefetch ${prefetch}). Gateway consumes queue "${NOTIFICATIONS_GATEWAY_QUEUE}" for events "${COMMENT_NEW_EVENT}" and "${TASK_UPDATED_EVENT}".`,
  );
}

void bootstrap();
