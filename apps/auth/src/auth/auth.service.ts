import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RpcException } from '@nestjs/microservices';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import type {
  AuthLoginRequest,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthRefreshRequest,
  AuthRefreshResponse,
  AuthRegisterResponse,
  AuthTokens,
  AuthUser,
} from '@repo/contracts';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) { }

  async register(createUserDto: CreateUserDto): Promise<AuthRegisterResponse> {
    const exists = await this.users.findOne({
      where: { email: createUserDto.email },
    });

    if (exists)
      throw new RpcException({
        statusCode: HttpStatus.CONFLICT,
        message: 'email already in use',
      });

    const passwordHash = await this.hashPassword(createUserDto.password);

    const user = await this.users.save(
      this.users.create({ ...createUserDto, passwordHash } as Partial<User>),
    );

    const tokens = await this.createTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return { user: this.toAuthUser(user), ...tokens };
  }

  async login({
    username,
    password,
  }: AuthLoginRequest): Promise<AuthLoginResponse> {
    const user = await this.users.findOne({ where: { email: username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new RpcException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'invalid credentials',
      });
    }
    const tokens = await this.createTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);
    return { user: this.toAuthUser(user), ...tokens };
  }

  async refresh({ refreshToken }: AuthRefreshRequest): Promise<AuthRefreshResponse> {
    if (!refreshToken) {
      throw this.buildUnauthorized('refresh token missing');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.users.findOne({ where: { id: payload.sub } });

    if (!user?.refreshTokenHash) {
      throw this.buildUnauthorized('invalid refresh token');
    }

    const isCurrent = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!isCurrent) {
      await this.clearRefreshToken(payload.sub);
      throw this.buildUnauthorized('invalid refresh token');
    }

    const tokens = await this.createTokens(user);
    await this.persistRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout({ refreshToken }: AuthRefreshRequest): Promise<AuthLogoutResponse> {
    if (!refreshToken) {
      return { success: true };
    }

    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.clearRefreshToken(payload.sub);
    } catch (error) {
      // Swallow the error to avoid leaking token validity information
    }

    return { success: true };
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = Number(this.cfg.get('BCRYPT_SALT_ROUNDS', 10));
    return bcrypt.hash(password, rounds);
  }

  private async createTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, name: user.name };
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.cfg.get('JWT_REFRESH_EXPIRES', this.cfg.get('JWT_REFRESH_TTL', '7d')),
      secret: this.cfg.get('JWT_REFRESH_SECRET', 'refreshSecretKey'),
    });
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.cfg.get('JWT_ACCESS_EXPIRES', this.cfg.get('JWT_EXPIRES_IN', '15m')),
      secret: this.cfg.get('JWT_ACCESS_SECRET', this.cfg.get('JWT_SECRET', 'secretKey')),
    });
    return { accessToken, refreshToken };
  }

  private async persistRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const rounds = Number(this.cfg.get('BCRYPT_SALT_ROUNDS', 10));
    const refreshTokenHash = await bcrypt.hash(refreshToken, rounds);
    await this.users.update({ id: userId }, { refreshTokenHash });
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    await this.users.update({ id: userId }, { refreshTokenHash: null });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{ sub: string }> {
    try {
      return await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.cfg.get('JWT_REFRESH_SECRET', 'refreshSecretKey'),
      });
    } catch (error) {
      throw this.buildUnauthorized('invalid refresh token');
    }
  }

  private buildUnauthorized(message: string): RpcException {
    return new RpcException({
      statusCode: HttpStatus.UNAUTHORIZED,
      message,
    });
  }

  private toAuthUser(user: User): AuthUser {
    const { id, email, name } = user;
    return { id, email, name };
  }
}
