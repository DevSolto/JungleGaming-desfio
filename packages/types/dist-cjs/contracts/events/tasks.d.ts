import type { CommentDTO } from "../../dto/comment.js";
import type { TaskDTO } from "../../dto/task.js";
import type { TaskAuditLogActorDTO, TaskAuditLogChangeDTO } from "../../dto/task-audit-log.js";
import type { CorrelatedMessage } from "../common/correlation.js";
export declare const TASK_EVENT_PATTERNS: {
    readonly CREATED: "task.created";
    readonly UPDATED: "task.updated";
    readonly DELETED: "task.deleted";
    readonly COMMENT_CREATED: "task.comment.created";
};
export type TaskEventPattern = (typeof TASK_EVENT_PATTERNS)[keyof typeof TASK_EVENT_PATTERNS];
export type TaskEventPayload = CorrelatedMessage<{
    task: TaskDTO;
    recipients?: string[];
    actor?: TaskAuditLogActorDTO | null;
    changes?: TaskAuditLogChangeDTO[] | Record<string, unknown> | null;
}>;
export type TaskCommentCreatedEventPayload = CorrelatedMessage<{
    comment: CommentDTO;
    recipients?: string[];
}>;
export declare const TASK_FORWARDING_PATTERNS: {
    readonly COMMENT_CREATED: "tasks.comment.created";
    readonly CREATED: "tasks.created";
    readonly UPDATED: "tasks.updated";
    readonly DELETED: "tasks.deleted";
};
export type TaskForwardingPattern = (typeof TASK_FORWARDING_PATTERNS)[keyof typeof TASK_FORWARDING_PATTERNS];
export type TaskCommentCreatedPayload = CorrelatedMessage<TaskCommentCreatedEventPayload & {
    recipients: string[];
}>;
type TaskForwardPayload = CorrelatedMessage<{
    task: TaskDTO | {
        id: string;
        [key: string]: unknown;
    };
    recipients: string[];
    actor?: TaskAuditLogActorDTO | null;
    changes?: TaskAuditLogChangeDTO[] | Record<string, unknown> | null;
}>;
export type TaskCreatedForwardPayload = TaskForwardPayload;
export type TaskUpdatedForwardPayload = TaskForwardPayload;
export type TaskDeletedForwardPayload = TaskForwardPayload;
export {};
