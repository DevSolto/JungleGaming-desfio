import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);

  const origin = config.get<string>('CORS_ORIGIN', '*');

  app.setGlobalPrefix('api');

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
await app.listen(process.env.PORT ?? 3001);
  Logger.log(`API docs available at http://localhost:${process.env.PORT ?? 3003}/api/docs`);

}
bootstrap();
