export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'archived'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskDTO {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
}
