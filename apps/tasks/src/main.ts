import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('TasksBootstrap');
  const configService = new ConfigService();

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
    `Tasks microservice connected to ${rabbitMqUrl} on queue "${queue}" (prefetch ${prefetch})`,
  );
}

void bootstrap();
