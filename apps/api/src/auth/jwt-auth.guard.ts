import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Socket } from 'socket.io';

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
    if (context.getType() === 'ws') {
      return this.canActivateWs(context);
    }

    return this.canActivateHttp(context);
  }

  private async canActivateHttp(context: ExecutionContext): Promise<boolean> {
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

  private async canActivateWs(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket & {
      data?: Record<string, unknown>;
    }>();
    const token = this.extractTokenFromWs(client);

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

      if (!client.data) {
        client.data = {};
      }

      client.data.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired.');
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' && token ? token : null;
  }

  private extractTokenFromWs(client: Socket): string | null {
    const headerToken = this.extractTokenFromAuthorizationHeader(
      this.normalizeHeader(client.handshake.headers['authorization']),
    );

    if (headerToken) {
      return headerToken;
    }

    const authToken = this.normalizeString(client.handshake.auth?.token);
    if (authToken) {
      return authToken;
    }

    const queryToken = this.normalizeString(
      client.handshake.query?.token as string | string[] | undefined,
    );

    return queryToken;
  }

  private extractTokenFromAuthorizationHeader(value?: string): string | null {
    if (!value) {
      return null;
    }

    const [type, token] = value.trim().split(/\s+/, 2);
    return type === 'Bearer' && token ? token : null;
  }

  private normalizeHeader(value?: string | string[]): string | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized?.trim() ?? undefined;
  }

  private normalizeString(value?: string | string[]): string | null {
    if (!value) {
      return null;
    }

    if (Array.isArray(value)) {
      const [first] = value;
      return first ? first.toString().trim() : null;
    }

    return value.trim();
  }
}
