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
import { AppLoggerService, createAppLogger } from '@repo/logger';
import { RpcContextInterceptor } from './common/logging/rpc-context.interceptor';

/**
 * Messaging topology shared with the API Gateway:
 * - Notifications service consumes domain events from `NOTIFICATIONS_SERVICE_QUEUE`.
 * - Forwarded WebSocket events are published to `NOTIFICATIONS_GATEWAY_QUEUE`
 *   using the `COMMENT_NEW_EVENT` and `TASK_UPDATED_EVENT` topics.
 */
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
  const bootstrapLogger = createAppLogger({
    name: 'notifications-service',
  }).withContext({
    service: 'notifications-service',
    context: 'bootstrap',
  });
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
  const httpPort = parseNumberEnv(configService.get<string>('PORT'), 3005);
  const rawOrigins = configService.get<string>('CORS_ORIGIN', '*');
  const parsedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowAllOrigins =
    parsedOrigins.length === 0 || parsedOrigins.includes('*');

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
    const attemptLogger = bootstrapLogger.withContext({
      context: 'bootstrap-attempt',
      attempt,
    });
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    app.enableCors({
      origin: allowAllOrigins ? true : parsedOrigins,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    const appLogger = app.get(AppLoggerService).withContext({
      service: 'notifications-service',
      context: 'http-application',
    });
    const rpcContextInterceptor = app.get(RpcContextInterceptor);
    app.useLogger(appLogger);

    const microservice = app.connectMicroservice<MicroserviceOptions>(
      microserviceOptions,
    );

    const microserviceLogger = appLogger.withContext({
      context: 'rmq-microservice',
    });
    microservice.useLogger(microserviceLogger);
    microservice.useGlobalInterceptors(rpcContextInterceptor);

    try {
      await app.startAllMicroservices();
      await app.listen(httpPort);
      microserviceLogger.log('Notifications microservice connected to RabbitMQ.', {
        rabbitMqUrl,
        queue,
        prefetch,
        attempts: attempt,
        gatewayQueue: NOTIFICATIONS_GATEWAY_QUEUE,
        events: [COMMENT_NEW_EVENT, TASK_UPDATED_EVENT],
        httpPort,
      });
      break;
    } catch (error) {
      await Promise.allSettled([
        microservice.close(),
        app.close(),
      ]);

      if (!isConnectionRefused(error)) {
        attemptLogger.error('Failed to bootstrap notifications service.', error, {
          rabbitMqUrl,
          queue,
          prefetch,
          httpPort,
        });
        throw error;
      }

      const delay = Math.min(
        retryDelayMax,
        retryDelay * 2 ** Math.max(0, attempt - 1),
      );
      attemptLogger.error('RabbitMQ connection attempt failed. Retrying.', error, {
        delayMs: delay,
        rabbitMqUrl,
        queue,
        prefetch,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

void bootstrap();
