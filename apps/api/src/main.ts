import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const origin = config.get<string>('CORS_ORIGIN', '*');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: origin.split(','),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const docConfig = new DocumentBuilder()
    .setTitle('Jungle Tasks — API Gateway')
    .setDescription('HTTP entrypoint for Jungle microservices')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  const document = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('/api/docs', app, document);

  const port = Number(config.get('PORT', 3001));
  await app.listen(port);
  Logger.log(`API running on http://localhost:${port}/api`);
  Logger.log(`API docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
