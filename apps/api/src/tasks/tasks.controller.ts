import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateCommentBodyDto,
  CreateTaskDto,
  ListTaskCommentsQueryDto,
  ListTasksQueryDto,
  TaskIdParamDto,
  UpdateTaskDto,
  type ApiResponse,
  type PaginatedResponse,
  type Comment,
  type Task,
  type TaskActor,
} from '@repo/types';
import { TasksService } from './tasks.service';
import type { ListTaskCommentsFilters } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
      dueDate: query.dueDate,
    });

    return this.toPaginatedResponse<Task>(result);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Retrieve a task by id' })
  async findById(@Param() params: TaskIdParamDto): Promise<ApiResponse<Task>> {
    const task = await this.tasksService.findById(params.id);
    return this.toItemResponse(task);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Create a new task' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload | undefined,
  ): Promise<ApiResponse<Task>> {
    const currentUser = this.ensureAuthenticatedUser(user);
    const task = await this.tasksService.create(
      dto,
      this.toTaskActor(currentUser),
    );
    return this.toItemResponse(task);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Update a task' })
  async update(
    @Param() params: TaskIdParamDto,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload | undefined,
  ): Promise<ApiResponse<Task>> {
    const currentUser = this.ensureAuthenticatedUser(user);
    const task = await this.tasksService.update(
      params.id,
      dto,
      this.toTaskActor(currentUser),
    );
    return this.toItemResponse(task);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Delete a task' })
  async remove(
    @Param() params: TaskIdParamDto,
    @CurrentUser() user: CurrentUserPayload | undefined,
  ): Promise<ApiResponse<Task>> {
    const currentUser = this.ensureAuthenticatedUser(user);
    const task = await this.tasksService.remove(
      params.id,
      this.toTaskActor(currentUser),
    );
    return this.toItemResponse(task);
  }

  @Get(':id/comments')
  @ApiOkResponse({ description: 'List comments for a task with pagination' })
  async listComments(
    @Param() params: TaskIdParamDto,
    @Query() query: ListTaskCommentsQueryDto,
  ): Promise<PaginatedResponse<Comment>> {
    const filters: ListTaskCommentsFilters = {
      page: query.page ?? 1,
      limit: query.limit ?? 10,
    };

    const result = await this.tasksService.listComments(params.id, filters);

    return this.toPaginatedResponse<Comment>(result);
  }

  @Post(':id/comments')
  @ApiCreatedResponse({ description: 'Create a new comment for a task' })
  async createComment(
    @Param() params: TaskIdParamDto,
    @Body() dto: CreateCommentBodyDto,
    @CurrentUser() user: CurrentUserPayload | undefined,
  ): Promise<ApiResponse<Comment>> {
    if (!user?.sub) {
      throw new UnauthorizedException('Authenticated user is required.');
    }

    const authorName =
      typeof user.name === 'string' && user.name.trim().length > 0
        ? user.name.trim()
        : undefined;

    const comment = await this.tasksService.createComment(params.id, {
      authorId: user.sub,
      authorName,
      message: dto.message,
    });

    return this.toItemResponse(comment);
  }

  private ensureAuthenticatedUser(
    user: CurrentUserPayload | undefined,
  ): CurrentUserPayload {
    if (!user?.sub) {
      throw new UnauthorizedException('Authenticated user is required.');
    }

    return user;
  }

  private toTaskActor(user: CurrentUserPayload): TaskActor {
    return {
      id: user.sub,
      name: user.name,
      email: user.email,
    };
  }

  private toItemResponse<T>(item: T): ApiResponse<T> {
    return { data: item };
  }

  private toPaginatedResponse<T>(
    result: { data: T[]; total: number; page: number; limit: number },
  ): PaginatedResponse<T> {
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
