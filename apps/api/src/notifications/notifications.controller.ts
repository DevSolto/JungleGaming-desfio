import {
  Controller,
  Get,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ListNotificationsQueryDto,
  type Notification,
  type PaginatedResponse,
} from '@repo/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';
import type {
  ListNotificationsFilters,
  PaginatedNotificationResult,
} from './notifications.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOkResponse({ description: 'List notifications with pagination' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload | undefined,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedResponse<Notification>> {
    const currentUser = this.ensureAuthenticatedUser(user);
    const filters: ListNotificationsFilters = {
      status: query.status,
      channel: query.channel,
      search: query.search,
      from: query.from,
      to: query.to,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      taskId: query.taskId,
    };

    const result = await this.notificationsService.findAll(
      currentUser.sub,
      filters,
    );

    return this.toPaginatedResponse(result);
  }

  private ensureAuthenticatedUser(
    user: CurrentUserPayload | undefined,
  ): CurrentUserPayload {
    if (!user?.sub) {
      throw new UnauthorizedException('Authenticated user is required.');
    }

    return user;
  }

  private toPaginatedResponse(
    result: PaginatedNotificationResult,
  ): PaginatedResponse<Notification> {
    const totalPages =
      result.limit > 0 ? Math.ceil(result.total / result.limit) : 0;

    return {
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        size: result.limit,
        totalPages,
      },
    };
  }
}
