import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import type { CreateTask } from '@repo/types';
import { TaskPriority, TaskStatus } from '@repo/types';

export class TaskAssigneeDto implements CreateTask['assignees'][number] {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  username: string;
}

export class CreateTaskDto implements CreateTask {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssigneeDto)
  assignees: TaskAssigneeDto[];
}
