import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  NOTIFICATIONS_GATEWAY_CLIENT,
  NOTIFICATIONS_GATEWAY_QUEUE,
} from './notifications.constants';
import { HealthModule } from './health/health.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
