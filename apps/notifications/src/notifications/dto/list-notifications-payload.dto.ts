import { Type } from 'class-transformer';
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
} from 'class-validator';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
  type NotificationsFindAllPayload,
} from '@repo/types';

export class ListNotificationsPayloadDto
  implements NotificationsFindAllPayload
{
  @IsUUID()
  @IsNotEmpty()
  recipientId!: string;

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

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  requestId?: string | null;
}
