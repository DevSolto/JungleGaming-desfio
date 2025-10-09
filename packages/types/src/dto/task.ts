import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { TaskPriority, TaskStatus } from "../enums/task.js";

export interface TaskAssigneeDTO {
  id: string;
  username: string;
}

export type TaskAssignee = TaskAssigneeDTO;

export interface TaskDTO {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assignees: TaskAssigneeDTO[];
  createdAt: string;
  updatedAt: string;
}

export type Task = TaskDTO;

export interface TaskActorDTO {
  id: string;
  name?: string | null;
  email?: string | null;
}

export type TaskActor = TaskActorDTO;

export class TaskActorDto implements TaskActorDTO {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  name?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  email?: string | null;
}

export interface CreateTaskDTO {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assignees: TaskAssigneeDTO[];
}

export type CreateTask = CreateTaskDTO;

export type UpdateTaskDTO = Partial<CreateTaskDTO> & {
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type UpdateTask = UpdateTaskDTO;

export interface TaskListFiltersDTO {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  assigneeId?: string;
  dueDate?: string;
  page?: number;
  limit?: number;
}

export type TaskListFilters = TaskListFiltersDTO;

export interface PaginatedTasksDTO {
  data: TaskDTO[];
  total: number;
  page: number;
  limit: number;
}

export type PaginatedTasks = PaginatedTasksDTO;

export class TaskIdDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class TaskIdParamDto extends TaskIdDto {}

export class TaskAssigneeDto implements TaskAssigneeDTO {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;
}

export class CreateTaskDto implements CreateTaskDTO {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @IsEnum(TaskPriority)
  priority!: TaskPriority;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssigneeDto)
  assignees!: TaskAssigneeDto[];
}

export interface CreateTaskPayloadDTO extends CreateTaskDTO {
  actor?: TaskActorDTO | null;
}

export class CreateTaskPayloadDto
  extends CreateTaskDto
  implements CreateTaskPayloadDTO
{
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => TaskActorDto)
  actor?: TaskActorDto | null;
}

export class UpdateTaskDto implements UpdateTaskDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssigneeDto)
  assignees?: TaskAssigneeDto[];
}

export interface UpdateTaskPayloadDTO {
  id: string;
  data: UpdateTaskDTO;
  actor?: TaskActorDTO | null;
}

export type UpdateTaskPayload = UpdateTaskPayloadDTO;

export class UpdateTaskPayloadDto implements UpdateTaskPayloadDTO {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @ValidateNested()
  @IsNotEmptyObject({ nullable: false })
  @Type(() => UpdateTaskDto)
  data!: UpdateTaskDto;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => TaskActorDto)
  actor?: TaskActorDto | null;
}

export interface RemoveTaskPayloadDTO extends TaskIdDto {
  actor?: TaskActorDTO | null;
}

export class RemoveTaskPayloadDto
  extends TaskIdDto
  implements RemoveTaskPayloadDTO
{
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @ValidateNested()
  @Type(() => TaskActorDto)
  actor?: TaskActorDto | null;
}

export class ListTasksDto implements TaskListFiltersDTO {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

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

export class ListTasksQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size?: number;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
