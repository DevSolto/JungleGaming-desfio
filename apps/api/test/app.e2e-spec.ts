import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AUTH_SERVICE } from '../src/auth/auth.constants';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';
import {
  AUTH_EMAIL_CONFLICT,
  AUTH_INVALID_CREDENTIALS,
} from '@repo/types';
import { validationExceptionFactory } from '../src/common/pipes/validation-exception.factory';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authClient: { send: jest.Mock };

  beforeEach(async () => {
    authClient = { send: jest.fn() };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_SERVICE)
      .useValue(authClient)
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
              message: expect.stringContaining('email'),
            }),
            expect.objectContaining({
              field: 'name',
              code: 'isNotEmpty',
              message: expect.stringContaining('name'),
            }),
            expect.objectContaining({
              field: 'password',
              code: 'minLength',
              message: expect.stringContaining('password'),
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
});
