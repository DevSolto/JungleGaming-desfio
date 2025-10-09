import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { AppLoggerService } from '@repo/logger';
import type {
  PaginatedNotifications,
  TaskCommentCreatedPayload,
  TaskUpdatedForwardPayload,
} from '@repo/types';

import {
  NOTIFICATIONS_MESSAGE_PATTERNS,
  TASKS_COMMENT_CREATED_PATTERN,
  TASKS_UPDATED_PATTERN,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  private readonly logger: AppLoggerService;

  constructor(
    private readonly notificationsService: NotificationsService,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.withContext({
      context: NotificationsController.name,
    });
  }

  @MessagePattern(NOTIFICATIONS_MESSAGE_PATTERNS.FIND_ALL)
  async handleFindAll(
    @Payload() payload: unknown,
    @Ctx() context: RmqContext,
  ): Promise<PaginatedNotifications> {
    this.logger.debug(
      `📥 Received RPC pattern ${NOTIFICATIONS_MESSAGE_PATTERNS.FIND_ALL}`,
    );
    const response = await this.notificationsService.findAll(payload, context);
    this.logger.debug(
      `📤 Responding to RPC pattern ${NOTIFICATIONS_MESSAGE_PATTERNS.FIND_ALL}`,
    );
    return response;
  }

  @EventPattern(TASKS_COMMENT_CREATED_PATTERN)
  async handleNewComment(
    @Payload() payload: TaskCommentCreatedPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    this.logger.debug(
      `📥 Received event pattern ${TASKS_COMMENT_CREATED_PATTERN}`,
    );
    await this.notificationsService.handleNewComment(payload, context);
  }

  @EventPattern(TASKS_UPDATED_PATTERN)
  async handleTaskUpdated(
    @Payload() payload: TaskUpdatedForwardPayload,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    this.logger.debug(`📥 Received event pattern ${TASKS_UPDATED_PATTERN}`);
    await this.notificationsService.handleTaskUpdated(payload, context);
  }
}
