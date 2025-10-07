import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';

type MockRepository = Partial<Record<keyof Repository<User>, jest.Mock>>;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: MockRepository;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    const configValues: Record<string, unknown> = {
      BCRYPT_SALT_ROUNDS: 1,
      JWT_REFRESH_SECRET: 'refreshSecretKey',
      JWT_REFRESH_EXPIRES: '7d',
      JWT_ACCESS_SECRET: 'accessSecretKey',
      JWT_ACCESS_EXPIRES: '15m',
      JWT_SECRET: 'accessSecretKey',
      JWT_EXPIRES_IN: '15m',
    };

    configService = {
      get: jest.fn(<T = unknown>(key: string, defaultValue?: T) =>
        (configValues[key] ?? defaultValue) as T,
      ),
    } as unknown as jest.Mocked<ConfigService>;

    service = new AuthService(
      usersRepository as unknown as Repository<User>,
      jwtService,
      configService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a user hashing password, issuing tokens and persisting refresh token', async () => {
    const dto: CreateUserDto = {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'strong-password',
    };

    (usersRepository.findOne as jest.Mock).mockResolvedValue(null);
    (usersRepository.create as jest.Mock).mockImplementation((entity) => entity);
    (usersRepository.save as jest.Mock).mockImplementation(async (entity) => ({
      id: 'user-1',
      email: entity.email,
      name: entity.name,
      passwordHash: entity.passwordHash,
    }));

    (usersRepository.update as jest.Mock).mockResolvedValue(undefined);

    jwtService.signAsync
      .mockResolvedValueOnce('refresh-token')
      .mockResolvedValueOnce('access-token');

    const result = await service.register(dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: dto.email },
    });
    expect(usersRepository.create).toHaveBeenCalled();
    const created = (usersRepository.create as jest.Mock).mock.calls[0][0];
    await expect(
      bcrypt.compare(dto.password, created.passwordHash),
    ).resolves.toBe(true);
    expect(usersRepository.save).toHaveBeenCalledWith(created);
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(usersRepository.update).toHaveBeenCalled();
    const refreshHash = (usersRepository.update as jest.Mock).mock.calls[0][1]
      .refreshTokenHash as string;
    await expect(bcrypt.compare('refresh-token', refreshHash)).resolves.toBe(true);
    expect(result).toEqual({
      user: { id: 'user-1', email: dto.email, name: dto.name },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('throws a conflict RpcException when email is already registered', async () => {
    const dto: CreateUserDto = {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'strong-password',
    };

    (usersRepository.findOne as jest.Mock).mockResolvedValue({
      id: 'existing',
    });

    try {
      await service.register(dto);
      fail('register should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RpcException);
      expect((error as RpcException).getError()).toMatchObject({
        statusCode: HttpStatus.CONFLICT,
        message: 'Email address is already registered.',
      });
    }

    expect(usersRepository.create).not.toHaveBeenCalled();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
