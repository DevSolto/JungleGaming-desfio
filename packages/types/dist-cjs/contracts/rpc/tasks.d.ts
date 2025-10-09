import type { CommentDTO, CreateCommentDTO, PaginatedCommentsDTO, TaskCommentListFiltersDTO } from "../../dto/comment.js";
import type { CreateTaskPayloadDTO, PaginatedTasksDTO, RemoveTaskPayloadDTO, TaskDTO, TaskListFiltersDTO, UpdateTaskPayloadDTO } from "../../dto/task.js";
import type { PaginatedTaskAuditLogsDTO, TaskAuditLogListFiltersDTO } from "../../dto/task-audit-log.js";
import type { CorrelatedMessage } from "../common/correlation.js";
export declare const TASKS_MESSAGE_PATTERNS: {
    readonly CREATE: "tasks.create";
    readonly FIND_ALL: "tasks.findAll";
    readonly FIND_BY_ID: "tasks.findById";
    readonly UPDATE: "tasks.update";
    readonly REMOVE: "tasks.remove";
    readonly COMMENT_CREATE: "tasks.comment.create";
    readonly COMMENT_FIND_ALL: "tasks.comment.findAll";
    readonly AUDIT_FIND_ALL: "tasks.audit.findAll";
};
export type TasksMessagePattern = (typeof TASKS_MESSAGE_PATTERNS)[keyof typeof TASKS_MESSAGE_PATTERNS];
export type TasksCreatePayload = CorrelatedMessage<CreateTaskPayloadDTO>;
export type TasksCreateResult = TaskDTO;
export type TasksFindAllPayload = CorrelatedMessage<TaskListFiltersDTO>;
export type TasksFindAllResult = PaginatedTasksDTO;
export type TasksFindByIdPayload = CorrelatedMessage<{
    id: string;
}>;
export type TasksFindByIdResult = TaskDTO;
export type TasksUpdatePayload = CorrelatedMessage<UpdateTaskPayloadDTO>;
export type TasksUpdateResult = TaskDTO;
export type TasksRemovePayload = CorrelatedMessage<RemoveTaskPayloadDTO>;
export type TasksRemoveResult = TaskDTO;
export type TasksCommentsCreatePayload = CorrelatedMessage<CreateCommentDTO>;
export type TasksCommentsCreateResult = CommentDTO;
export type TasksCommentsFindAllPayload = CorrelatedMessage<TaskCommentListFiltersDTO>;
export type TasksCommentsFindAllResult = PaginatedCommentsDTO;
export type TasksAuditFindAllPayload = CorrelatedMessage<TaskAuditLogListFiltersDTO>;
export type TasksAuditFindAllResult = PaginatedTaskAuditLogsDTO;
export interface TasksRpcContractMap {
    [TASKS_MESSAGE_PATTERNS.CREATE]: {
        payload: TasksCreatePayload;
        response: TasksCreateResult;
    };
    [TASKS_MESSAGE_PATTERNS.FIND_ALL]: {
        payload: TasksFindAllPayload;
        response: TasksFindAllResult;
    };
    [TASKS_MESSAGE_PATTERNS.FIND_BY_ID]: {
        payload: TasksFindByIdPayload;
        response: TasksFindByIdResult;
    };
    [TASKS_MESSAGE_PATTERNS.UPDATE]: {
        payload: TasksUpdatePayload;
        response: TasksUpdateResult;
    };
    [TASKS_MESSAGE_PATTERNS.REMOVE]: {
        payload: TasksRemovePayload;
        response: TasksRemoveResult;
    };
    [TASKS_MESSAGE_PATTERNS.COMMENT_CREATE]: {
        payload: TasksCommentsCreatePayload;
        response: TasksCommentsCreateResult;
    };
    [TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL]: {
        payload: TasksCommentsFindAllPayload;
        response: TasksCommentsFindAllResult;
    };
    [TASKS_MESSAGE_PATTERNS.AUDIT_FIND_ALL]: {
        payload: TasksAuditFindAllPayload;
        response: TasksAuditFindAllResult;
    };
}
