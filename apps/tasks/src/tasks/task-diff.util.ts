import { isDeepStrictEqual } from 'node:util';
import type {
  TaskAuditLogChangeDTO,
  TaskAssigneeDTO,
  TaskPriority,
  TaskStatus,
} from '@repo/types';
import type { Task } from './task.entity';

export type TaskState = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'dueDate' | 'assignees'
>;

export function createTaskStateSnapshot(task: Task): TaskState {
  return {
    title: task.title,
    description: task.description ?? null,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    assignees: Array.isArray(task.assignees)
      ? task.assignees.map((assignee) => ({ ...assignee }))
      : [],
  };
}

export function diffTaskChanges(
  previous: TaskState,
  current: TaskState,
): TaskAuditLogChangeDTO[] {
  const fields: (keyof TaskState)[] = [
    'title',
    'description',
    'status',
    'priority',
    'dueDate',
    'assignees',
  ];

  const changes: TaskAuditLogChangeDTO[] = [];

  for (const field of fields) {
    const previousValue = normalizeFieldValue(field, previous[field]);
    const currentValue = normalizeFieldValue(field, current[field]);

    if (isDeepStrictEqual(previousValue, currentValue)) {
      continue;
    }

    changes.push({
      field,
      previousValue,
      currentValue,
    });
  }

  return changes;
}

type TaskField = keyof TaskState;

type NormalizedFieldValue =
  | string
  | null
  | TaskAssigneeDTO[]
  | TaskStatus
  | TaskPriority;

function normalizeFieldValue(
  field: TaskField,
  value: TaskState[TaskField],
): NormalizedFieldValue {
  if (value === undefined || value === null) {
    return field === 'assignees' ? [] : null;
  }

  switch (field) {
    case 'dueDate':
      const dateValue = value as Date | string;
      return dateValue instanceof Date
        ? dateValue.toISOString()
        : new Date(dateValue).toISOString();
    case 'assignees':
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .filter((assignee) => assignee && typeof assignee.id === 'string')
        .map(normalizeAssigneeForDiff)
        .sort((a, b) => a.id.localeCompare(b.id));
    case 'status':
    case 'priority':
      return value as TaskStatus | TaskPriority;
    case 'title':
    case 'description':
    default:
      return typeof value === 'string' ? value : String(value);
  }
}

function normalizeAssigneeForDiff(assignee: TaskAssigneeDTO): TaskAssigneeDTO {
  const normalized: TaskAssigneeDTO = {
    id: typeof assignee.id === 'string' ? assignee.id.trim() : assignee.id,
    username:
      typeof assignee.username === 'string'
        ? assignee.username.trim()
        : assignee.username,
  };

  if (assignee.name === null) {
    normalized.name = null;
  } else if (typeof assignee.name === 'string') {
    const trimmedName = assignee.name.trim();
    if (trimmedName.length > 0) {
      normalized.name = trimmedName;
    } else {
      normalized.name = null;
    }
  }

  if (assignee.email === null) {
    normalized.email = null;
  } else if (typeof assignee.email === 'string') {
    const trimmedEmail = assignee.email.trim();
    if (trimmedEmail.length > 0) {
      normalized.email = trimmedEmail;
    } else {
      normalized.email = null;
    }
  }

  return normalized;
}
