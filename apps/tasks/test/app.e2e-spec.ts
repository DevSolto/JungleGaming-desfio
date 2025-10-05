import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Express } from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tasks Service (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return a healthy response', async () => {
    const server = app.getHttpServer() as unknown as Express;

    await request(server)
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('status', 'ok');
        expect(body).toHaveProperty('ts');
      });
  });
});
