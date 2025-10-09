import { TaskPriority, TaskStatus, type TaskAssigneeDTO } from '@repo/types';
import { Task } from './task.entity';
import {
  createTaskStateSnapshot,
  diffTaskChanges,
  type TaskState,
} from './task-diff.util';

function createTask(overrides: Partial<Task> = {}): Task {
  const task = new Task();
  task.id = 'task-1';
  task.title = 'Initial title';
  task.description = 'Initial description';
  task.status = TaskStatus.TODO;
  task.priority = TaskPriority.MEDIUM;
  task.dueDate = new Date('2024-05-20T12:00:00.000Z');
  task.assignees = [
    { id: 'b', username: 'beta' },
    { id: 'a', username: 'alpha' },
  ];

  Object.assign(task, overrides);
  return task;
}

describe('task-diff.util', () => {
  it('creates immutable snapshots from entities', () => {
    const original = createTask();

    const snapshot = createTaskStateSnapshot(original);

    expect(snapshot).toEqual({
      title: 'Initial title',
      description: 'Initial description',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date('2024-05-20T12:00:00.000Z'),
      assignees: [
        { id: 'b', username: 'beta' },
        { id: 'a', username: 'alpha' },
      ],
    });

    snapshot.assignees?.push({ id: 'c', username: 'gamma' });
    expect(original.assignees).toHaveLength(2);
  });

  it('produces normalized diffs for scalar and date fields', () => {
    const previous = createTaskStateSnapshot(createTask());
    const current: TaskState = {
      ...previous,
      title: 'Updated title',
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date('2024-05-21T09:30:00.000Z'),
    };

    const changes = diffTaskChanges(previous, current);

    expect(changes).toEqual(
      expect.arrayContaining([
        {
          field: 'title',
          previousValue: 'Initial title',
          currentValue: 'Updated title',
        },
        {
          field: 'status',
          previousValue: TaskStatus.TODO,
          currentValue: TaskStatus.IN_PROGRESS,
        },
        {
          field: 'dueDate',
          previousValue: '2024-05-20T12:00:00.000Z',
          currentValue: '2024-05-21T09:30:00.000Z',
        },
      ]),
    );
  });

  it('ignores identical states and sorts assignees deterministically', () => {
    const assignees: TaskAssigneeDTO[] = [
      { id: 'b', username: 'beta' },
      { id: 'a', username: 'alpha' },
    ];

    const previous: TaskState = {
      title: 'Title',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees,
    };

    const current: TaskState = {
      ...previous,
      assignees: [...assignees].reverse(),
    };

    const changes = diffTaskChanges(previous, current);

    expect(changes).toEqual([]);
  });

  it('treats undefined and null values consistently for nullable fields', () => {
    const previous: TaskState = {
      title: 'Title',
      description: 'Something',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      assignees: [],
    };

    const current: TaskState = {
      ...previous,
      description: null,
      assignees: undefined as unknown as TaskAssigneeDTO[],
    };

    const changes = diffTaskChanges(previous, current);

    expect(changes).toEqual([
      {
        field: 'description',
        previousValue: 'Something',
        currentValue: null,
      },
    ]);
    expect(changes.some((change) => change.field === 'assignees')).toBe(false);
  });
});
