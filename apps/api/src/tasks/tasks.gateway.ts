import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
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
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server?: Server;

  private readonly logger = new Logger(TasksGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  emitToClients(event: string, payload: unknown): void {
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
    }
  }
}
