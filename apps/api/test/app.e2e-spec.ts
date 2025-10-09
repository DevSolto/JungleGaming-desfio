import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AUTH_SERVICE } from '../src/auth/auth.constants';
import { TASKS_RPC_CLIENT } from '../src/tasks/tasks.constants';
import { RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import {
  AUTH_EMAIL_CONFLICT,
  AUTH_INVALID_CREDENTIALS,
  type AuthRegisterResponse,
} from '@repo/types';
import { validationExceptionFactory } from '../src/common/pipes/validation-exception.factory';
import { TASKS_MESSAGE_PATTERNS } from '@repo/types';
import {
  createCreateTaskDtoFixture,
  createPaginatedAuditLogsFixture,
  createTaskAuditLogFixture,
  createTaskFixture,
  createUpdateTaskDtoFixture,
} from './__mocks__/tasks.fixtures';
import {
  createCommentFixture,
  createPaginatedCommentsFixture,
} from './__mocks__/comments.fixtures';
import { JwtService } from '@nestjs/jwt';
import { MOCK_AUTHORIZATION_HEADER } from './utils/auth.constants';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authClient: { send: jest.Mock };
  let tasksClient: { send: jest.Mock };
  const expectedActor = {
    id: 'user-1',
    email: 'player@junglegaming.dev',
    name: 'Player One',
  };

  beforeEach(async () => {
    authClient = { send: jest.fn() };
    tasksClient = { send: jest.fn() };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_SERVICE)
      .useValue(authClient)
      .overrideProvider(TASKS_RPC_CLIENT)
      .useValue(tasksClient)
      .overrideProvider(JwtService)
      .useValue({
        verifyAsync: jest.fn().mockResolvedValue({
          sub: 'user-1',
          email: 'player@junglegaming.dev',
          name: 'Player One',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/register returns 409 when email already exists', async () => {
    authClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.CONFLICT,
            message: 'Email address is already registered.',
            code: AUTH_EMAIL_CONFLICT,
          }),
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'player@junglegaming.dev',
        name: 'Player One',
        password: 'secret1',
      })
      .expect(HttpStatus.CONFLICT)
      .expect(({ body }: { body: { message?: string; code?: string } }) => {
        expect(body.message).toBe('Email address is already registered.');
        expect(body.code).toBe(AUTH_EMAIL_CONFLICT);
      });
  });

  it('POST /auth/register succeeds, returns session and sets refresh cookie', async () => {
    const mockResponse: AuthRegisterResponse = {
      user: {
        id: 'user-1',
        email: 'player@junglegaming.dev',
        name: 'Player One',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };

    authClient.send.mockReturnValueOnce(of(mockResponse));

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'player@junglegaming.dev',
        name: 'Player One',
        password: 'secret1',
      })
      .expect(HttpStatus.CREATED)
      .expect(({ body, headers }) => {
        expect(body).toEqual({
          user: mockResponse.user,
          accessToken: mockResponse.accessToken,
        });

        const setCookieHeader = headers['set-cookie'];
        expect(Array.isArray(setCookieHeader)).toBe(true);
        expect(setCookieHeader.some((value: string) =>
          value.startsWith(`refreshToken=${mockResponse.refreshToken}`),
        )).toBe(true);
      });

    expect(authClient.send).toHaveBeenCalledTimes(1);
  });

  it('POST /auth/register returns validation errors with consistent shape', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'not-an-email',
        name: '',
        password: '123',
      })
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(body.message).toBe('Validation failed');
        expect(Array.isArray(body.errors)).toBe(true);
        expect(body.errors.length).toBeGreaterThan(0);
        expect(body.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              code: 'isEmail',
              message: expect.any(String),
            }),
            expect.objectContaining({
              field: 'name',
              code: 'isNotEmpty',
              message: expect.any(String),
            }),
            expect.objectContaining({
              field: 'password',
              code: 'minLength',
              message: expect.any(String),
            }),
          ]),
        );
      });

    expect(authClient.send).not.toHaveBeenCalled();
  });

  it('POST /auth/login returns 401 when credentials are invalid', async () => {
    authClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Invalid email or password.',
            code: AUTH_INVALID_CREDENTIALS,
          }),
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'player@junglegaming.dev', password: 'secret1' })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }: { body: { message?: string; code?: string } }) => {
        expect(body.message).toBe('Invalid email or password.');
        expect(body.code).toBe(AUTH_INVALID_CREDENTIALS);
      });
  });

  it('POST /tasks creates a task and returns the created entity', async () => {
    const createPayload = createCreateTaskDtoFixture();
    const createdTask = createTaskFixture();

    tasksClient.send.mockReturnValueOnce(of(createdTask));

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .send(createPayload)
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toEqual({ data: createdTask });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.CREATE,
      expect.anything(),
    );

    const [, payload] = tasksClient.send.mock.calls[0];
    expect(payload).toMatchObject({
      ...createPayload,
      actor: expectedActor,
    });
  });

  it('POST /tasks maps RPC errors to HTTP responses', async () => {
    const createPayload = createCreateTaskDtoFixture();

    tasksClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            message: 'Title already exists',
            code: 'TASK_TITLE_CONFLICT',
          }),
      ),
    );

    await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .send(createPayload)
      .expect(HttpStatus.UNPROCESSABLE_ENTITY)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(body.message).toBe('Title already exists');
        expect(body.code).toBe('TASK_TITLE_CONFLICT');
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.CREATE,
      expect.anything(),
    );

    const [, payload] = tasksClient.send.mock.calls[0];
    expect(payload).toMatchObject({
      ...createPayload,
      actor: expectedActor,
    });
  });

  it('PUT /tasks/:id updates a task and returns the updated entity', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const updatePayload = createUpdateTaskDtoFixture();
    const updatedTask = createTaskFixture({
      id: taskId,
      ...updatePayload,
      updatedAt: '2024-01-20T10:00:00.000Z',
    });

    tasksClient.send.mockReturnValueOnce(of(updatedTask));

    await request(app.getHttpServer())
      .put(`/tasks/${taskId}`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .send(updatePayload)
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toEqual({ data: updatedTask });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.UPDATE,
      expect.anything(),
    );

    const [, payload] = tasksClient.send.mock.calls[0];
    expect(payload).toMatchObject({
      id: taskId,
      data: updatePayload,
      actor: expectedActor,
    });
  });

  it('DELETE /tasks/:id removes a task and returns the deleted entity', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const removedTask = createTaskFixture({ id: taskId });

    tasksClient.send.mockReturnValueOnce(of(removedTask));

    await request(app.getHttpServer())
      .delete(`/tasks/${taskId}`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toEqual({ data: removedTask });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.REMOVE,
      expect.anything(),
    );

    const [, payload] = tasksClient.send.mock.calls[0];
    expect(payload).toMatchObject({
      id: taskId,
      actor: expectedActor,
    });
  });

  it('GET /tasks returns a paginated list when authorized', async () => {
    const task = createTaskFixture();
    const paginatedResponse = {
      data: [task],
      total: 1,
      page: 1,
      limit: 10,
    };

    tasksClient.send.mockReturnValueOnce(of(paginatedResponse));

    await request(app.getHttpServer())
      .get('/tasks')
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: paginatedResponse.data,
          meta: {
            total: paginatedResponse.total,
            page: paginatedResponse.page,
            size: paginatedResponse.limit,
            totalPages: 1,
          },
        });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.FIND_ALL,
      expect.objectContaining({
        page: 1,
        limit: 10,
      }),
    );
  });

  it('GET /tasks returns 401 Unauthorized without Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/tasks')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(body.message).toBe('Access token is required.');
      });

    expect(tasksClient.send).not.toHaveBeenCalled();
  });

  it('GET /tasks/:id/comments returns paginated comments when authorized', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const comment = createCommentFixture({ taskId });
    const paginatedComments = createPaginatedCommentsFixture({
      data: [comment],
      page: 2,
      limit: 5,
      total: 12,
    });

    tasksClient.send.mockReturnValueOnce(of(paginatedComments));

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}/comments`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .query({ page: 2, limit: 5 })
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: paginatedComments.data,
          meta: {
            total: paginatedComments.total,
            page: paginatedComments.page,
            size: paginatedComments.limit,
            totalPages: 3,
          },
        });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL,
      expect.objectContaining({
        taskId,
        page: 2,
        limit: 5,
      }),
    );
  });

  it('GET /tasks/:id/comments returns 401 without Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/tasks/2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678/comments')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(body.message).toBe('Access token is required.');
      });

    expect(tasksClient.send).not.toHaveBeenCalled();
  });

  it('GET /tasks/:id/comments maps RPC errors to HTTP responses', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';

    tasksClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Task not found',
            code: 'TASK_NOT_FOUND',
          }),
      ),
    );

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}/comments`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .expect(HttpStatus.NOT_FOUND)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.NOT_FOUND);
        expect(body.message).toBe('Task not found');
        expect(body.code).toBe('TASK_NOT_FOUND');
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.COMMENT_FIND_ALL,
      expect.objectContaining({ taskId }),
    );
  });

  it('GET /tasks/:id/audit-log returns paginated audit logs when authorized', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const auditLogs = createPaginatedAuditLogsFixture({
      page: 2,
      limit: 5,
      total: 13,
      data: [
        createTaskAuditLogFixture({
          id: 'log-2',
          taskId,
          createdAt: '2024-05-21T12:00:00.000Z',
        }),
      ],
    });

    tasksClient.send.mockReturnValueOnce(of(auditLogs));

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}/audit-log`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .query({ page: auditLogs.page, limit: auditLogs.limit })
      .expect(HttpStatus.OK)
      .expect(({ body }) => {
        expect(body).toEqual({
          data: auditLogs.data,
          meta: {
            page: auditLogs.page,
            size: auditLogs.limit,
            total: auditLogs.total,
            totalPages: Math.ceil(auditLogs.total / auditLogs.limit),
          },
        });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    const [pattern, payload] = tasksClient.send.mock.calls[0];
    expect(pattern).toBe(TASKS_MESSAGE_PATTERNS.AUDIT_FIND_ALL);
    expect(payload.taskId).toBe(taskId);
    expect(Number(payload.page)).toBe(auditLogs.page);
    expect(Number(payload.limit)).toBe(auditLogs.limit);
  });

  it('GET /tasks/:id/audit-log returns 401 without Authorization header', async () => {
    await request(app.getHttpServer())
      .get('/tasks/2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678/audit-log')
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(body.message).toBe('Access token is required.');
      });

    expect(tasksClient.send).not.toHaveBeenCalled();
  });

  it('GET /tasks/:id/audit-log maps RPC errors to HTTP responses', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';

    tasksClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Invalid pagination parameters',
          }),
      ),
    );

    await request(app.getHttpServer())
      .get(`/tasks/${taskId}/audit-log`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(body.message).toBe('Invalid pagination parameters');
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    const [pattern, payload] = tasksClient.send.mock.calls[0];
    expect(pattern).toBe(TASKS_MESSAGE_PATTERNS.AUDIT_FIND_ALL);
    expect(payload.taskId).toBe(taskId);
    expect(Number(payload.page)).toBe(1);
    expect(Number(payload.limit)).toBe(10);
  });

  it('POST /tasks/:id/comments creates a comment and returns the created entity', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const requestBody = { message: 'New update from the field.' };
    const createdComment = createCommentFixture({
      taskId,
      message: requestBody.message,
    });

    tasksClient.send.mockReturnValueOnce(of(createdComment));

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/comments`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .send(requestBody)
      .expect(HttpStatus.CREATED)
      .expect(({ body }) => {
        expect(body).toEqual({ data: createdComment });
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.COMMENT_CREATE,
      expect.objectContaining({
        taskId,
        authorId: 'user-1',
        authorName: 'Player One',
        message: requestBody.message,
      }),
    );
  });

  it('POST /tasks/:id/comments maps RPC errors to HTTP responses', async () => {
    const taskId = '2f1b7b58-9d1f-4a7e-8f6a-2c5d12345678';
    const requestBody = { message: 'This comment exceeds the limit.' };

    tasksClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Comment message is too long',
            code: 'COMMENT_MESSAGE_TOO_LONG',
          }),
      ),
    );

    await request(app.getHttpServer())
      .post(`/tasks/${taskId}/comments`)
      .set('Authorization', MOCK_AUTHORIZATION_HEADER)
      .send(requestBody)
      .expect(HttpStatus.BAD_REQUEST)
      .expect(({ body }) => {
        expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(body.message).toBe('Comment message is too long');
        expect(body.code).toBe('COMMENT_MESSAGE_TOO_LONG');
      });

    expect(tasksClient.send).toHaveBeenCalledTimes(1);
    expect(tasksClient.send).toHaveBeenCalledWith(
      TASKS_MESSAGE_PATTERNS.COMMENT_CREATE,
      expect.objectContaining({
        taskId,
        authorId: 'user-1',
        authorName: 'Player One',
      }),
    );
  });
});
