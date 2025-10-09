import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TasksService } from './tasks.service';
import { TASKS_RPC_CLIENT, TASKS_RPC_QUEUE } from './tasks.constants';
import { TasksController } from './tasks.controller';
import { TasksGateway } from './tasks.gateway';
import { TasksEventsController } from './tasks.events.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    NotificationsModule,
    ClientsModule.registerAsync([
      {
        name: TASKS_RPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              config.get<string>(
                'RABBITMQ_URL',
                'amqp://admin:admin@localhost:5672',
              ),
            ],
            queue: config.get<string>('TASKS_RPC_QUEUE', TASKS_RPC_QUEUE),
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [TasksController, TasksEventsController],
  providers: [TasksService, TasksGateway],
  exports: [TasksService],
})
export class TasksModule {}
