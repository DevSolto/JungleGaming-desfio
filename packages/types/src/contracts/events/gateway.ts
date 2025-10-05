import type {
  TaskCommentCreatedPayload,
  TaskUpdatedForwardPayload,
} from "./tasks.js";

export const GATEWAY_EVENT_PATTERNS = {
  COMMENT_NEW: "comment.new",
  TASK_UPDATED: "task.updated",
} as const;

export type GatewayEventPattern =
  (typeof GATEWAY_EVENT_PATTERNS)[keyof typeof GATEWAY_EVENT_PATTERNS];

export interface CommentNewEvent {
  pattern: typeof GATEWAY_EVENT_PATTERNS.COMMENT_NEW;
  payload: TaskCommentCreatedPayload;
}

export interface TaskUpdatedEvent {
  pattern: typeof GATEWAY_EVENT_PATTERNS.TASK_UPDATED;
  payload: TaskUpdatedForwardPayload;
}
