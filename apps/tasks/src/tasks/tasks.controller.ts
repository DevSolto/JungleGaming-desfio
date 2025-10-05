import {
  BadRequestException,
  Controller,
  HttpException,
} from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNotEmptyObject,
  IsUUID,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './create-task.dto';
import { ListTasksDto } from './list-tasks.dto';
import { UpdateTaskDto } from './update-task.dto';

class TaskIdDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;
}

class UpdateTaskPayloadDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @IsNotEmptyObject({ nullable: false })
  @Type(() => UpdateTaskDto)
  data: UpdateTaskDto;
}

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @MessagePattern('tasks.create')
  async create(@Payload() payload: unknown) {
    try {
      const dto = this.transformPayload(CreateTaskDto, payload);
      return await this.tasksService.create(dto);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern('tasks.findAll')
  async findAll(@Payload() payload: unknown) {
    try {
      const dto = this.transformPayload(ListTasksDto, payload ?? {});
      return await this.tasksService.findAll(dto);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern('tasks.findById')
  async findById(@Payload() payload: unknown) {
    try {
      const { id } = this.transformPayload(TaskIdDto, payload);
      return await this.tasksService.findById(id);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern('tasks.update')
  async update(@Payload() payload: unknown) {
    try {
      const { id, data } = this.transformPayload(UpdateTaskPayloadDto, payload);
      return await this.tasksService.update(id, data);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  @MessagePattern('tasks.remove')
  async remove(@Payload() payload: unknown) {
    try {
      const { id } = this.transformPayload(TaskIdDto, payload);
      return await this.tasksService.remove(id);
    } catch (error) {
      throw this.toRpcException(error);
    }
  }

  private transformPayload<T>(cls: new () => T, payload: unknown): T {
    const dto = plainToInstance(cls, payload, {
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    const errors = validateSync(dto as object, {
      whitelist: true,
      forbidUnknownValues: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return dto;
  }

  private toRpcException(error: unknown): RpcException {
    if (error instanceof RpcException) {
      return error;
    }

    if (error instanceof HttpException) {
      return new RpcException({
        status: error.getStatus(),
        response: error.getResponse(),
      });
    }

    if (error instanceof Error) {
      return new RpcException({
        message: error.message,
      });
    }

    return new RpcException(error as Record<string, unknown>);
  }
}
