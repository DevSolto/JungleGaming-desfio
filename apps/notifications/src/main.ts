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
const logger = new Logger('NotificationsBootstrap');

function parseNumberEnv(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function isConnectionRefused(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ECONNREFUSED'
  );
}

async function bootstrap() {
  const configService = new ConfigService();

  const rabbitMqUrl = configService.get<string>(
    'RABBITMQ_URL',
    'amqp://admin:admin@localhost:5672',
  );
  const queue = configService.get<string>(
    'RABBITMQ_QUEUE',
    NOTIFICATIONS_SERVICE_QUEUE,
  );
  const prefetch = parseNumberEnv(
    configService.get<string>('RABBITMQ_PREFETCH'),
    10,
  );
  const retryDelay = parseNumberEnv(
    configService.get<string>('RABBITMQ_RETRY_DELAY_MS'),
    3_000,
  );
  const retryDelayMax = Math.max(
    retryDelay,
    parseNumberEnv(
      configService.get<string>('RABBITMQ_RETRY_MAX_DELAY_MS'),
      30_000,
    ),
  );

  const microserviceOptions: MicroserviceOptions = {
    transport: Transport.RMQ,
    options: {
      urls: [rabbitMqUrl],
      queue,
      queueOptions: {
        durable: true,
      },
      prefetchCount: prefetch,
    },
  };

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      microserviceOptions,
    );

    try {
      await app.listen();
      logger.log(
        `Notifications microservice connected to ${rabbitMqUrl} on queue "${queue}" (prefetch ${prefetch}) after ${attempt} attempt(s). Gateway consumes queue "${NOTIFICATIONS_GATEWAY_QUEUE}" for events "${COMMENT_NEW_EVENT}" and "${TASK_UPDATED_EVENT}".`,
      );
      break;
    } catch (error) {
      await app.close().catch(() => undefined);

      if (!isConnectionRefused(error)) {
        throw error;
      }

      const delay = Math.min(
        retryDelayMax,
        retryDelay * 2 ** Math.max(0, attempt - 1),
      );
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        `RabbitMQ connection attempt #${attempt} failed (${message}). Retrying in ${Math.round(
          delay / 1000,
        )}s.`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

void bootstrap();
