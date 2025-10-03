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
  ) {}

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

    const tokens = await this.createToken(user);

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
    const tokens = await this.createToken(user);
    return { user: this.toAuthUser(user), ...tokens };
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = Number(this.cfg.get('BCRYPT_SALT_ROUNDS', 10));
    return bcrypt.hash(password, rounds);
  }

  private async createToken(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, name: user.name };
    return {
      access_token: await this.jwt.signAsync(payload, {
        expiresIn: this.cfg.get('JWT_EXPIRES_IN', '15m'),
        secret: this.cfg.get('JWT_SECRET', 'secretKey'),
      }),
    };
  }

  private toAuthUser(user: User): AuthUser {
    const { id, email, name } = user;
    return { id, email, name };
  }
}
