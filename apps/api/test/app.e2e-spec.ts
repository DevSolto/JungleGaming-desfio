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
  createTaskFixture,
  createUpdateTaskDtoFixture,
} from './__mocks__/tasks.fixtures';
import { JwtService } from '@nestjs/jwt';
import { MOCK_AUTHORIZATION_HEADER } from './utils/auth.constants';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authClient: { send: jest.Mock };
  let tasksClient: { send: jest.Mock };

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
      .useValue({ verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1' }) })
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
      createPayload,
    );
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
      createPayload,
    );
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
      { id: taskId, data: updatePayload },
    );
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
      { id: taskId },
    );
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
});
