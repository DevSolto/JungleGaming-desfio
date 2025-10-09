import type { CommentDTO } from "../../dto/comment.js";
import type { TaskDTO } from "../../dto/task.js";
import type {
  TaskAuditLogActorDTO,
  TaskAuditLogChangeDTO,
} from "../../dto/task-audit-log.js";
import type { CorrelatedMessage } from "../common/correlation.js";

export const TASK_EVENT_PATTERNS = {
  CREATED: "task.created",
  UPDATED: "task.updated",
  DELETED: "task.deleted",
  COMMENT_CREATED: "task.comment.created",
} as const;

export type TaskEventPattern =
  (typeof TASK_EVENT_PATTERNS)[keyof typeof TASK_EVENT_PATTERNS];

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

export const TASK_FORWARDING_PATTERNS = {
  COMMENT_CREATED: "tasks.comment.created",
  UPDATED: "tasks.updated",
} as const;

export type TaskForwardingPattern =
  (typeof TASK_FORWARDING_PATTERNS)[keyof typeof TASK_FORWARDING_PATTERNS];

export type TaskCommentCreatedPayload = CorrelatedMessage<
  TaskCommentCreatedEventPayload & {
    recipients: string[];
  }
>;

export type TaskUpdatedForwardPayload = CorrelatedMessage<{
  task: TaskDTO | { id: string; [key: string]: unknown };
  recipients: string[];
  actor?: TaskAuditLogActorDTO | null;
  changes?: TaskAuditLogChangeDTO[] | Record<string, unknown> | null;
}>;
