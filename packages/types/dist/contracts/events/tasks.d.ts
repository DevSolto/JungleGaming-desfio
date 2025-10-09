import type { CommentDTO } from "../../dto/comment.js";
import type { TaskDTO } from "../../dto/task.js";
import type { TaskAuditLogActorDTO, TaskAuditLogChangeDTO } from "../../dto/task-audit-log.js";
export declare const TASK_EVENT_PATTERNS: {
    readonly CREATED: "task.created";
    readonly UPDATED: "task.updated";
    readonly DELETED: "task.deleted";
    readonly COMMENT_CREATED: "task.comment.created";
};
export type TaskEventPattern = (typeof TASK_EVENT_PATTERNS)[keyof typeof TASK_EVENT_PATTERNS];
export interface TaskEventPayload {
    task: TaskDTO;
    recipients?: string[];
    actor?: TaskAuditLogActorDTO | null;
    changes?: TaskAuditLogChangeDTO[] | Record<string, unknown> | null;
}
export interface TaskCommentCreatedEventPayload extends Pick<TaskEventPayload, "recipients"> {
    comment: CommentDTO;
}
export declare const TASK_FORWARDING_PATTERNS: {
    readonly COMMENT_CREATED: "tasks.comment.created";
    readonly UPDATED: "tasks.updated";
};
export type TaskForwardingPattern = (typeof TASK_FORWARDING_PATTERNS)[keyof typeof TASK_FORWARDING_PATTERNS];
export interface TaskCommentCreatedPayload extends TaskCommentCreatedEventPayload {
    recipients: string[];
}
export interface TaskUpdatedForwardPayload {
    task: TaskDTO | {
        id: string;
        [key: string]: unknown;
    };
    recipients: string[];
    actor?: TaskAuditLogActorDTO | null;
    changes?: TaskAuditLogChangeDTO[] | Record<string, unknown> | null;
}
//# sourceMappingURL=tasks.d.ts.map