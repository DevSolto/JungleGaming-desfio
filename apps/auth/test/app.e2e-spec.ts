import { Body, Controller, INestApplication, Post, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthService } from '../src/auth/auth.service';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { User } from '../src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

type StoredUser = Pick<User, 'id' | 'email' | 'name' | 'passwordHash'> & {
  refreshTokenHash?: string | null;
};

@Controller('auth')
class AuthHttpController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }
}

const users: StoredUser[] = [];
let idCounter = 1;

const usersRepository = {
  findOne: jest.fn(async ({ where: { email } }: { where: { email: string } }) => {
    return users.find((user) => user.email === email) ?? null;
  }),
  create: jest.fn((entity: Partial<User>) => entity),
  save: jest.fn(async (entity: Partial<User>) => {
    const user: StoredUser = {
      id: `user-${idCounter++}`,
      email: entity.email as string,
      name: entity.name as string,
      passwordHash: entity.passwordHash as string,
    };
    users.push(user);
    return user as unknown as User;
  }),
  update: jest.fn(async ({ id }: { id: string }, partial: Partial<User>) => {
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) {
      users[index] = {
        ...users[index],
        ...partial,
      };
    }
  }),
} as Partial<Record<keyof Repository<User>, jest.Mock>>;

const configValues: Record<string, unknown> = {
  BCRYPT_SALT_ROUNDS: 1,
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_REFRESH_EXPIRES: '1d',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_ACCESS_EXPIRES: '15m',
  JWT_SECRET: 'access-secret',
  JWT_EXPIRES_IN: '15m',
};

const configService: Partial<ConfigService> = {
  get: <T = unknown>(key: string, defaultValue?: T) =>
    (configValues[key] ?? defaultValue) as T,
};

const jwtService = new JwtService({});

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthHttpController],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository as Partial<Repository<User>>,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    users.length = 0;
    idCounter = 1;
    jest.clearAllMocks();
  });

  it('POST /auth/register should enforce validation rules', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'john@example.com',
        name: 'John Doe',
        password: '12345',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('password must be at least 6 characters long');
  });

  it('POST /auth/register should hash password and store hashed refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'john@example.com',
        name: 'John Doe',
        password: 'strong-password',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(users).toHaveLength(1);

    const stored = users[0];

    expect(stored.passwordHash).not.toBe('strong-password');
    await expect(bcrypt.compare('strong-password', stored.passwordHash)).resolves.toBe(true);
    expect(stored.refreshTokenHash).toBeDefined();
    await expect(
      bcrypt.compare(response.body.refreshToken, stored.refreshTokenHash ?? ''),
    ).resolves.toBe(true);
  });
});
