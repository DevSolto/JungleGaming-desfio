import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type JwtPayload = {
  sub: string;
  [key: string]: unknown;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required.');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>(
          'JWT_ACCESS_SECRET',
          this.config.get<string>('JWT_SECRET', 'secretKey'),
        ),
      });
      request['user'] = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired.');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }
}
