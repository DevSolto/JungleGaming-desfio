import type { TaskCommentCreatedPayload, TaskUpdatedForwardPayload } from "./tasks.js";
export declare const GATEWAY_EVENT_PATTERNS: {
    readonly COMMENT_NEW: "comment.new";
    readonly TASK_UPDATED: "task.updated";
};
export type GatewayEventPattern = (typeof GATEWAY_EVENT_PATTERNS)[keyof typeof GATEWAY_EVENT_PATTERNS];
export interface CommentNewEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.COMMENT_NEW;
    payload: TaskCommentCreatedPayload;
}
export interface TaskUpdatedEvent {
    pattern: typeof GATEWAY_EVENT_PATTERNS.TASK_UPDATED;
    payload: TaskUpdatedForwardPayload;
}
//# sourceMappingURL=gateway.d.ts.map