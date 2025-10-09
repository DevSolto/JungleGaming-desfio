import { CorrelatedDto } from "./correlation.js";
export interface CommentDTO {
    id: string;
    taskId: string;
    authorId: string;
    authorName: string | null;
    message: string;
    createdAt: string;
    updatedAt: string;
}
export type Comment = CommentDTO;
export declare const COMMENT_MESSAGE_MAX_LENGTH = 500;
export declare const COMMENT_AUTHOR_NAME_MAX_LENGTH = 255;
export interface CreateCommentDTO {
    taskId: string;
    authorId: string;
    authorName?: string | null;
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
export declare class CreateCommentBodyDto implements Pick<CreateCommentDTO, "message"> {
    message: string;
}
export declare class CreateCommentDto extends CorrelatedDto implements CreateCommentDTO {
    taskId: string;
    authorId: string;
    authorName?: string | null;
    message: string;
}
export declare class ListTaskCommentsDto extends CorrelatedDto implements TaskCommentListFiltersDTO {
    taskId: string;
    page?: number;
    limit?: number;
}
export declare class ListTaskCommentsQueryDto {
    page?: number;
    limit?: number;
}
