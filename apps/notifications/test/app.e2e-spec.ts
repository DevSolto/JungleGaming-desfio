import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

const isSupertestApp = (value: unknown): value is App =>
  typeof value === 'function' ||
  typeof value === 'string' ||
  (typeof value === 'object' && value !== null);

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', async () => {
    const httpServer: unknown = app.getHttpServer();

    if (!isSupertestApp(httpServer)) {
      throw new TypeError(
        'Invalid HTTP server instance received from Nest application.',
      );
    }

    await request(httpServer).get('/').expect(200).expect('Hello World!');
  });
});
