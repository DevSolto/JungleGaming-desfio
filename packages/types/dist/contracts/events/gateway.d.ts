import type { TaskCommentCreatedPayload, TaskCreatedForwardPayload, TaskDeletedForwardPayload, TaskUpdatedForwardPayload } from "./tasks.js";
export declare const GATEWAY_EVENT_PATTERNS: {
    readonly COMMENT_NEW: "comment.new";
    readonly TASK_CREATED: "task.created";
    readonly TASK_UPDATED: "task.updated";
    readonly TASK_DELETED: "task.deleted";
};
export type GatewayEventPattern = (typeof GATEWAY_EVENT_PATTERNS)[keyof typeof GATEWAY_EVENT_PATTERNS];
export interface CommentNewEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.COMMENT_NEW;
    payload: TaskCommentCreatedPayload;
}
export interface TaskCreatedEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.TASK_CREATED;
    payload: TaskCreatedForwardPayload;
}
export interface TaskUpdatedEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.TASK_UPDATED;
    payload: TaskUpdatedForwardPayload;
}
export interface TaskDeletedEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.TASK_DELETED;
    payload: TaskDeletedForwardPayload;
}
//# sourceMappingURL=gateway.d.ts.map