import { Logger, UseGuards } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { CommentDTO, Task } from '@repo/types';
import { GATEWAY_EVENT_PATTERNS, TASK_EVENT_PATTERNS } from '@repo/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const rawOrigins = process.env.CORS_ORIGINS ?? '*';
const parsedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);
const allowAllOrigins =
  parsedOrigins.length === 0 || parsedOrigins.includes('*');

@WebSocketGateway({
  cors: {
    origin: allowAllOrigins ? true : parsedOrigins,
    credentials: true,
  },
})
@UseGuards(JwtAuthGuard)
export class TasksGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server?: Server;

  private readonly logger = new Logger(TasksGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @EventPattern(TASK_EVENT_PATTERNS.CREATED)
  onTaskCreated(
    @Payload() task: Task,
    @Ctx() context: RmqContext,
  ): void {
    this.forwardEvent('task:created', task, context);
  }

  @EventPattern(TASK_EVENT_PATTERNS.UPDATED)
  onTaskUpdated(
    @Payload() task: Task,
    @Ctx() context: RmqContext,
  ): void {
    this.forwardEvent('task:updated', task, context);
  }

  @EventPattern(TASK_EVENT_PATTERNS.DELETED)
  onTaskDeleted(
    @Payload() task: Task,
    @Ctx() context: RmqContext,
  ): void {
    this.forwardEvent('task:deleted', task, context);
  }

  @EventPattern(GATEWAY_EVENT_PATTERNS.COMMENT_NEW)
  onCommentNew(
    @Payload() comment: CommentDTO,
    @Ctx() context: RmqContext,
  ): void {
    this.forwardEvent('comment:new', comment, context);
  }

  private forwardEvent(
    event: string,
    payload: unknown,
    context: RmqContext,
  ): void {
    try {
      if (!this.server) {
        this.logger.warn(
          `Received "${event}" before WebSocket server initialization; dropping payload.`,
        );
        return;
      }

      this.server.emit(event, payload);
    } catch (error) {
      const messageDetail =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to emit WebSocket event "${event}": ${messageDetail}`,
        stack,
      );
    } finally {
      this.acknowledge(context);
    }
  }

  private acknowledge(context: RmqContext): void {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();

    if (channel && originalMessage) {
      channel.ack(originalMessage);
    }
  }
}
