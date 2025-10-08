import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TasksService, PaginatedTasks } from './tasks.service';
import {
  CreateTaskPayloadDto,
  ListTasksDto,
  RemoveTaskPayloadDto,
  TaskIdDto,
  TASKS_MESSAGE_PATTERNS,
  UpdateTaskPayloadDto,
} from '@repo/types';
import { transformPayload, toRpcException } from '../common/rpc.utils';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern(TASKS_MESSAGE_PATTERNS.CREATE)
  async create(@Payload() payload: unknown) {
    try {
      const { actor, ...data } = transformPayload(
        CreateTaskPayloadDto,
        payload,
      );
      return await this.tasksService.create(data, actor ?? null);
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.FIND_ALL)
  async findAll(@Payload() payload: unknown): Promise<PaginatedTasks> {
    try {
      const dto = transformPayload(ListTasksDto, payload ?? {});
      return await this.tasksService.findAll(dto);
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.FIND_BY_ID)
  async findById(@Payload() payload: unknown) {
    try {
      const { id } = transformPayload(TaskIdDto, payload);
      return await this.tasksService.findById(id);
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.UPDATE)
  async update(@Payload() payload: unknown) {
    try {
      const { id, data, actor } = transformPayload(
        UpdateTaskPayloadDto,
        payload,
      );
      return await this.tasksService.update(id, data, actor ?? null);
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.REMOVE)
  async remove(@Payload() payload: unknown) {
    try {
      const { id, actor } = transformPayload(RemoveTaskPayloadDto, payload);
      return await this.tasksService.remove(id, actor ?? null);
    } catch (error) {
      throw toRpcException(error);
    }
  }
}
