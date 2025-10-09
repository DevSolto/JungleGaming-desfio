import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  NOTIFICATIONS_GATEWAY_CLIENT,
  NOTIFICATIONS_GATEWAY_QUEUE,
} from './notifications.constants';
import { HealthModule } from './health/health.module';
import { NotificationsService } from './notifications.service';

const validateEnv = (config: Record<string, unknown>) => {
  const databaseUrl = config['DATABASE_URL'];

  if (typeof databaseUrl !== 'string' || databaseUrl.trim().length === 0) {
    throw new Error('DATABASE_URL must be defined as a non-empty string');
  }

  return config;
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: NOTIFICATIONS_GATEWAY_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RABBITMQ_URL',
                'amqp://admin:admin@localhost:5672',
              ),
            ],
            queue: configService.get<string>(
              'GATEWAY_EVENTS_QUEUE',
              NOTIFICATIONS_GATEWAY_QUEUE,
            ),
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
    HealthModule,
  ],
  providers: [NotificationsService],
})
export class AppModule {}
