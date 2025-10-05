import type { CommentDTO } from "../../dto/comment.js";
import type { TaskDTO } from "../../dto/task.js";

export const TASK_EVENT_PATTERNS = {
  CREATED: "task.created",
  UPDATED: "task.updated",
  DELETED: "task.deleted",
} as const;

export type TaskEventPattern =
  (typeof TASK_EVENT_PATTERNS)[keyof typeof TASK_EVENT_PATTERNS];

export interface TaskEventPayload {
  task: TaskDTO;
  recipients?: string[];
  changes?: Record<string, unknown>;
}

export const TASK_FORWARDING_PATTERNS = {
  COMMENT_CREATED: "tasks.comment.created",
  UPDATED: "tasks.updated",
} as const;

export type TaskForwardingPattern =
  (typeof TASK_FORWARDING_PATTERNS)[keyof typeof TASK_FORWARDING_PATTERNS];

export interface TaskCommentCreatedPayload {
  comment: CommentDTO;
  recipients: string[];
}

export interface TaskUpdatedForwardPayload {
  task: TaskDTO | { id: string; [key: string]: unknown };
  recipients: string[];
  changes?: Record<string, unknown>;
}
