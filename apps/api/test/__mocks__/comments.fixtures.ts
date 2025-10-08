import type { Comment, PaginatedComments } from '@repo/types';

export const createCommentFixture = (
  overrides: Partial<Comment> = {},
): Comment => ({
  id: 'c1b2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  taskId: '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678',
  authorId: 'user-1',
  message: 'Great work on this task!',
  createdAt: '2024-01-15T09:30:00.000Z',
  updatedAt: '2024-01-15T09:30:00.000Z',
  ...overrides,
});

export const createPaginatedCommentsFixture = (
  overrides: Partial<PaginatedComments> = {},
): PaginatedComments => ({
  data: [createCommentFixture()],
  total: 1,
  page: 1,
  limit: 10,
  ...overrides,
});
