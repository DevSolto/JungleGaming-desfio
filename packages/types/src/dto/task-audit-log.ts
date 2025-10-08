import { Type } from "class-transformer";
import {
  Allow,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export interface TaskAuditLogActorDTO {
  id: string;
  displayName?: string | null;
}

export interface TaskAuditLogChangeDTO {
  field: string;
  previousValue?: unknown;
  currentValue?: unknown;
}

export interface TaskAuditLogDTO {
  id: string;
  taskId: string;
  action: string;
  actorId?: string | null;
  actorDisplayName?: string | null;
  actor?: TaskAuditLogActorDTO | null;
  changes?: TaskAuditLogChangeDTO[] | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskAuditLogListFiltersDTO {
  taskId: string;
  page?: number;
  limit?: number;
}

export interface PaginatedTaskAuditLogsDTO {
  data: TaskAuditLogDTO[];
  total: number;
  page: number;
  limit: number;
}

export class TaskAuditLogActorDto implements TaskAuditLogActorDTO {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  displayName?: string | null;
}

export class TaskAuditLogChangeDto implements TaskAuditLogChangeDTO {
  @IsString()
  @IsNotEmpty()
  field!: string;

  @IsOptional()
  @Allow()
  previousValue?: unknown;

  @IsOptional()
  @Allow()
  currentValue?: unknown;
}

export class TaskAuditLogDto implements TaskAuditLogDTO {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  actorId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  actorDisplayName?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskAuditLogActorDto)
  actor?: TaskAuditLogActorDto | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAuditLogChangeDto)
  changes?: TaskAuditLogChangeDto[] | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  metadata?: Record<string, unknown> | null;

  @IsDateString()
  createdAt!: string;
}

export class ListTaskAuditLogsDto implements TaskAuditLogListFiltersDTO {
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

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
}

export class ListTaskAuditLogsQueryDto {
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
}

export class PaginatedTaskAuditLogsDto implements PaginatedTaskAuditLogsDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAuditLogDto)
  data!: TaskAuditLogDto[];

  @IsInt()
  total!: number;

  @IsInt()
  page!: number;

  @IsInt()
  limit!: number;
}
