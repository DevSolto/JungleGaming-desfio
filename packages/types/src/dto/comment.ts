import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export interface CommentDTO {
  id: string;
  taskId: string;
  authorId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type Comment = CommentDTO;

// Comments are limited to 500 characters to maintain readability across clients.
export const COMMENT_MESSAGE_MAX_LENGTH = 500;

export interface CreateCommentDTO {
  taskId: string;
  authorId: string;
  message: string;
}

export type CreateComment = CreateCommentDTO;

export interface TaskCommentListFiltersDTO {
  taskId: string;
  page?: number;
  limit?: number;
}

export type TaskCommentListFilters = TaskCommentListFiltersDTO;

export interface PaginatedCommentsDTO {
  data: CommentDTO[];
  total: number;
  page: number;
  limit: number;
}

export type PaginatedComments = PaginatedCommentsDTO;

export class CreateCommentBodyDto implements Pick<CreateCommentDTO, "message"> {
  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MESSAGE_MAX_LENGTH)
  message!: string;
}

export class CreateCommentDto implements CreateCommentDTO {
  @IsUUID()
  @IsNotEmpty()
  taskId!: string;

  @IsUUID()
  @IsNotEmpty()
  authorId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(COMMENT_MESSAGE_MAX_LENGTH)
  message!: string;
}

export class ListTaskCommentsDto implements TaskCommentListFiltersDTO {
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

export class ListTaskCommentsQueryDto {
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
