import {
  TaskPriority,
  TaskStatus,
  type CreateTask,
  type PaginatedTaskAuditLogsDTO,
  type Task,
  type TaskAuditLog,
  type UpdateTask,
} from '@repo/types';

export const createTaskFixture = (overrides: Partial<Task> = {}): Task => ({
  id: '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678',
  title: 'Rescue the forest spirit',
  description: 'Travel to the Whispering Woods and rescue the ancient spirit.',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: '2024-02-01T12:00:00.000Z',
  assignees: [
    {
      id: '5c1f8ad2-6b21-4b5f-b0b9-2d3f1c4e5a6b',
      username: 'player.one',
    },
  ],
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: '2024-01-15T08:00:00.000Z',
  ...overrides,
});

export const createCreateTaskDtoFixture = (
  overrides: Partial<CreateTask> = {},
): CreateTask => ({
  title: 'Rescue the forest spirit',
  description: 'Travel to the Whispering Woods and rescue the ancient spirit.',
  status: TaskStatus.TODO,
  priority: TaskPriority.MEDIUM,
  dueDate: '2024-02-01T12:00:00.000Z',
  assignees: [
    {
      id: '5c1f8ad2-6b21-4b5f-b0b9-2d3f1c4e5a6b',
      username: 'player.one',
    },
  ],
  ...overrides,
});

export const createUpdateTaskDtoFixture = (
  overrides: Partial<UpdateTask> = {},
): UpdateTask => ({
  title: 'Escort the forest spirit home',
  status: TaskStatus.IN_PROGRESS,
  priority: TaskPriority.HIGH,
  description: 'Ensure the ancient spirit returns safely to the Grove of Echoes.',
  dueDate: '2024-02-10T12:00:00.000Z',
  assignees: [
    {
      id: '8b2e3c4d-7f6a-4b8c-9d1e-3f2a1b4c5d6e',
      username: 'player.two',
    },
  ],
  ...overrides,
});

export const createTaskAuditLogFixture = (
  overrides: Partial<TaskAuditLog> = {},
): TaskAuditLog => ({
  id: 'log-1',
  taskId: '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678',
  action: 'task.updated',
  actorId: 'user-1',
  actorDisplayName: 'Player One',
  actor: {
    id: 'user-1',
    displayName: 'Player One',
  },
  changes: [
    {
      field: 'status',
      previousValue: TaskStatus.TODO,
      currentValue: TaskStatus.IN_PROGRESS,
    },
  ],
  metadata: null,
  createdAt: '2024-05-21T10:00:00.000Z',
  ...overrides,
});

export const createPaginatedAuditLogsFixture = (
  overrides: Partial<PaginatedTaskAuditLogsDTO> = {},
): PaginatedTaskAuditLogsDTO => ({
  data: [createTaskAuditLogFixture()],
  total: 1,
  page: 1,
  limit: 10,
  ...overrides,
});
