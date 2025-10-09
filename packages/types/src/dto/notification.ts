import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from "class-validator";
import type {
  NotificationChannel,
  NotificationStatus,
} from "../enums/notification.js";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from "../enums/notification.js";
import type { NotificationsFindAllPayload } from "../contracts/rpc/notifications.js";

export interface NotificationCreateDTO {
  recipientId: string;
  channel: NotificationChannel;
  message: string;
  metadata?: Record<string, unknown> | null;
  status?: NotificationStatus;
  sentAt?: string | null;
}

export interface NotificationStatusUpdateDTO {
  status: NotificationStatus;
  sentAt?: string | null;
}

export interface NotificationDTO {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  sentAt?: string | null;
}

export type Notification = NotificationDTO;

export interface NotificationListFiltersDTO {
  status?: NotificationStatus;
  channel?: NotificationChannel;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  taskId?: string;
}

export type NotificationListFilters = NotificationListFiltersDTO;

export interface PaginatedNotificationsDTO {
  data: NotificationDTO[];
  total: number;
  page: number;
  limit: number;
}

export type PaginatedNotifications = PaginatedNotificationsDTO;

export class NotificationIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class NotificationListFiltersDto
  implements NotificationListFiltersDTO
{
  @IsOptional()
  @IsEnum(NOTIFICATION_STATUSES)
  status?: NotificationStatus;

  @IsOptional()
  @IsEnum(NOTIFICATION_CHANNELS)
  channel?: NotificationChannel;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  search?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  from?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsUUID()
  taskId?: string;
}

export class ListNotificationsQueryDto
  extends NotificationListFiltersDto
  implements NotificationListFiltersDTO
{}

export class NotificationStatusUpdateDto
  implements NotificationStatusUpdateDTO
{
  @IsEnum(NOTIFICATION_STATUSES)
  status!: NotificationStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  sentAt?: string | null;
}

export class ListNotificationsPayloadDto
  extends NotificationListFiltersDto
  implements NotificationsFindAllPayload
{
  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  requestId?: string | null;
}
