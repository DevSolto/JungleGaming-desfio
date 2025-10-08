import type { CommentDTO } from "../../dto/comment.js";
import type { TaskDTO } from "../../dto/task.js";
export declare const TASK_EVENT_PATTERNS: {
    readonly CREATED: "task.created";
    readonly UPDATED: "task.updated";
    readonly DELETED: "task.deleted";
};
export type TaskEventPattern = (typeof TASK_EVENT_PATTERNS)[keyof typeof TASK_EVENT_PATTERNS];
export interface TaskEventPayload {
    task: TaskDTO;
    recipients?: string[];
    changes?: Record<string, unknown>;
}
export declare const TASK_FORWARDING_PATTERNS: {
    readonly COMMENT_CREATED: "tasks.comment.created";
    readonly UPDATED: "tasks.updated";
};
export type TaskForwardingPattern = (typeof TASK_FORWARDING_PATTERNS)[keyof typeof TASK_FORWARDING_PATTERNS];
export interface TaskCommentCreatedPayload {
    comment: CommentDTO;
    recipients: string[];
}
export interface TaskUpdatedForwardPayload {
    task: TaskDTO | {
        id: string;
        [key: string]: unknown;
    };
    recipients: string[];
    changes?: Record<string, unknown>;
}
