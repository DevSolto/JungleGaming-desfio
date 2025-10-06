import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  TaskIdParamDto,
  UpdateTaskDto,
} from '@repo/types';
import { TasksService } from './tasks.service';
import type { PaginatedTasks } from './tasks.service';
import type { Task } from '@repo/types';

interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    size: number;
    totalPages: number;
  };
}

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOkResponse({ description: 'List tasks with pagination' })
  async findAll(
    @Query() query: ListTasksQueryDto,
  ): Promise<PaginatedResponse<Task>> {
    const page = query.page ?? 1;
    const size = query.size ?? 10;

    const result = await this.tasksService.findAll({
      page,
      limit: size,
      status: query.status,
      priority: query.priority,
      search: query.search,
    });

    return this.toPaginatedResponse(result);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Retrieve a task by id' })
  async findById(@Param() params: TaskIdParamDto): Promise<ApiResponse<Task>> {
    const task = await this.tasksService.findById(params.id);
    return this.toItemResponse(task);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Create a new task' })
  async create(@Body() dto: CreateTaskDto): Promise<ApiResponse<Task>> {
    const task = await this.tasksService.create(dto);
    return this.toItemResponse(task);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Update a task' })
  async update(
    @Param() params: TaskIdParamDto,
    @Body() dto: UpdateTaskDto,
  ): Promise<ApiResponse<Task>> {
    const task = await this.tasksService.update(params.id, dto);
    return this.toItemResponse(task);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Delete a task' })
  async remove(@Param() params: TaskIdParamDto): Promise<ApiResponse<Task>> {
    const task = await this.tasksService.remove(params.id);
    return this.toItemResponse(task);
  }

  private toItemResponse(task: Task): ApiResponse<Task> {
    return { data: task };
  }

  private toPaginatedResponse(result: PaginatedTasks): PaginatedResponse<Task> {
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
