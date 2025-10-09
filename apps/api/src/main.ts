import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TASKS_EVENTS_QUEUE } from './tasks/tasks.constants';
import {
  NOTIFICATIONS_EVENTS_QUEUE,
  NOTIFICATIONS_GATEWAY_QUEUE,
} from './notifications/notifications.constants';
import { HttpExceptionCodeFilter } from './common/filters/http-exception-code.filter';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { AppLoggerService } from '@repo/logger';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { RequestContextMiddleware } from './common/logging/request-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);

  const config = app.get(ConfigService);

  const requestContextMiddleware = app.get(RequestContextMiddleware);
  app.use(requestContextMiddleware.use.bind(requestContextMiddleware));

  const rabbitMqUrl = config.get<string>(
    'RABBITMQ_URL',
    'amqp://admin:admin@localhost:5672',
  );
  const eventQueues = [
    config.get<string>('TASKS_EVENTS_QUEUE', TASKS_EVENTS_QUEUE),
    config.get<string>(
      'NOTIFICATIONS_EVENTS_QUEUE',
      NOTIFICATIONS_EVENTS_QUEUE,
    ),
    config.get<string>(
      'NOTIFICATIONS_GATEWAY_QUEUE',
      NOTIFICATIONS_GATEWAY_QUEUE,
    ),
  ].filter((queue): queue is string => Boolean(queue?.trim()));

  const uniqueQueues = Array.from(new Set(eventQueues));

  for (const queue of uniqueQueues) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [rabbitMqUrl],
        queue,
        queueOptions: {
          durable: true,
        },
      },
    });
  }

  app.use(cookieParser());
  app.use(helmet());
  app.useGlobalFilters(new HttpExceptionCodeFilter());

  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const rawOrigins = config.get<string>('*', '*');
  const parsedOrigins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowAllOrigins =
    parsedOrigins.length === 0 || parsedOrigins.includes('*');

  app.enableCors({
    origin: allowAllOrigins ? true : parsedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const docConfig = new DocumentBuilder()
    .setTitle('Jungle Gaming — API')
    .setDescription('HTTP entrypoint for Jungle microservices')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('/api/docs', app, document);

  const port = Number(config.get('PORT', 3001));
  await app.startAllMicroservices();
  await app.listen(port);
  appLogger.log(`API running on http://localhost:${port}/api`);
  appLogger.log(`API docs available at http://localhost:${port}/api/docs`);
}
void bootstrap();
