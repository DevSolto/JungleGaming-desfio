import { PartialType } from '@nestjs/mapped-types';
import type { UpdateTask } from '@repo/types';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto
  extends PartialType(CreateTaskDto)
  implements UpdateTask {}
