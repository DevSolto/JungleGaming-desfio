import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CommentsService, PaginatedComments } from './comments.service';
import {
  CreateCommentDto,
  ListTaskCommentsDto,
  TASKS_MESSAGE_PATTERNS,
} from '@repo/types';
import { transformPayload, toRpcException } from '../common/rpc.utils';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @MessagePattern(TASKS_MESSAGE_PATTERNS.COMMENT_CREATE)
  async create(@Payload() payload: unknown) {
    try {
      const dto = transformPayload(CreateCommentDto, payload);
      return await this.commentsService.create(dto);
    } catch (error) {
      throw toRpcException(error);
    }
  }

  @MessagePattern(TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL)
  async findAll(@Payload() payload: unknown): Promise<PaginatedComments> {
    try {
      const dto = transformPayload(ListTaskCommentsDto, payload ?? {});
      return await this.commentsService.findAll(dto);
    } catch (error) {
      throw toRpcException(error);
    }
  }
}
