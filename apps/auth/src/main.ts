import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { resolveWaitForDatabaseOptions, waitForDatabase } from './database/wait-for-database';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.AUTH_SERVICE_PORT ?? process.env.PORT ?? 4010);
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim().length > 0) {
    const options = resolveWaitForDatabaseOptions(process.env, databaseUrl);

    try {
      await waitForDatabase(options);
    } catch (error) {
      logger.error('Failed to establish an initial connection to PostgreSQL. Aborting startup.');
      throw error;
    }
  } else {
    logger.warn('DATABASE_URL is not defined. Skipping PostgreSQL availability checks.');
  }

  const tcpApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port },
  });

  await tcpApp.listen();
  logger.log(`Auth microservice is listening on TCP port ${port}`);
}
bootstrap();
