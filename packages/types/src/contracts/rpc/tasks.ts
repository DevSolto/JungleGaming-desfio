import type {
  CommentDTO,
  CreateCommentDTO,
  PaginatedCommentsDTO,
  TaskCommentListFiltersDTO,
} from "../../dto/comment.js";
import type {
  CreateTaskDTO,
  PaginatedTasksDTO,
  TaskDTO,
  TaskListFiltersDTO,
  UpdateTaskDTO,
} from "../../dto/task.js";
import type {
  PaginatedTaskAuditLogsDTO,
  TaskAuditLogListFiltersDTO,
} from "../../dto/task-audit-log.js";

export const TASKS_MESSAGE_PATTERNS = {
  CREATE: "tasks.create",
  FIND_ALL: "tasks.findAll",
  FIND_BY_ID: "tasks.findById",
  UPDATE: "tasks.update",
  REMOVE: "tasks.remove",
  COMMENT_CREATE: "tasks.comment.create",
  COMMENT_FIND_ALL: "tasks.comment.findAll",
  AUDIT_FIND_ALL: "tasks.audit.findAll",
} as const;

export type TasksMessagePattern =
  (typeof TASKS_MESSAGE_PATTERNS)[keyof typeof TASKS_MESSAGE_PATTERNS];

export type TasksCreatePayload = CreateTaskDTO;
export type TasksCreateResult = TaskDTO;

export type TasksFindAllPayload = TaskListFiltersDTO;
export type TasksFindAllResult = PaginatedTasksDTO;

export interface TasksFindByIdPayload {
  id: string;
}
export type TasksFindByIdResult = TaskDTO;

export interface TasksUpdatePayload {
  id: string;
  data: UpdateTaskDTO;
}
export type TasksUpdateResult = TaskDTO;

export interface TasksRemovePayload {
  id: string;
}
export type TasksRemoveResult = TaskDTO;

export type TasksCommentsCreatePayload = CreateCommentDTO;
export type TasksCommentsCreateResult = CommentDTO;

export type TasksCommentsFindAllPayload = TaskCommentListFiltersDTO;
export type TasksCommentsFindAllResult = PaginatedCommentsDTO;

export type TasksAuditFindAllPayload = TaskAuditLogListFiltersDTO;
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
