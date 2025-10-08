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
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    case 'assignees':
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((assignee) => ({
          id: assignee.id,
          username: assignee.username,
        }))
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
