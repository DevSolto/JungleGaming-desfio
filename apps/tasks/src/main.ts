import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  const origin = config.get<string>('CORS_ORIGIN', '*');

  app.enableCors({
    origin: origin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger placeholder
  const docConfig = new DocumentBuilder()
    .setTitle('Jungle Tasks — API Gateway')
    .setDescription('Placeholder da documentação HTTP via Swagger')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('/api/docs', app, document);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://admin:admin@localhost:5672'],
      queue: 'tasks.rpc',
      queueOptions: {
        durable: true,
        prefetchCount: 10,
      }
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3003);
  Logger.log(`API docs available at http://localhost:${process.env.PORT ?? 3003}/api/docs`);
}
bootstrap();
