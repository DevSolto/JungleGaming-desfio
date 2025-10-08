import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskAuditLog } from './task-audit-log.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TASKS_EVENTS_CLIENT, TASKS_EVENTS_QUEUE } from './tasks.constants';
import { Comment } from '../comments/comment.entity';
import { CommentsService } from '../comments/comments.service';
import { CommentsController } from '../comments/comments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Comment, TaskAuditLog]),
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: TASKS_EVENTS_CLIENT,
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
            queue: TASKS_EVENTS_QUEUE,
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [TasksController, CommentsController],
  providers: [TasksService, CommentsService],
  exports: [TypeOrmModule, TasksService],
})
export class TasksModule {}
