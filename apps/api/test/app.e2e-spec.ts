import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AUTH_SERVICE } from '../src/auth/auth.constants';
import { RpcException } from '@nestjs/microservices';
import { throwError } from 'rxjs';

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
      .expect(({ body }: { body: { message?: string } }) => {
        expect(body.message).toBe('Email address is already registered.');
      });
  });

  it('POST /auth/login returns 401 when credentials are invalid', async () => {
    authClient.send.mockReturnValueOnce(
      throwError(
        () =>
          new RpcException({
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Invalid username or password.',
          }),
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'player@junglegaming.dev', password: 'secret1' })
      .expect(HttpStatus.UNAUTHORIZED)
      .expect(({ body }: { body: { message?: string } }) => {
        expect(body.message).toBe('Invalid username or password.');
      });
  });
});
