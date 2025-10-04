import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const port = Number(process.env.AUTH_SERVICE_PORT ?? process.env.PORT ?? 4010);

  const tcpApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  await tcpApp.listen();
  Logger.log(`Auth microservice is listening on TCP port ${port}`);
}
bootstrap();
