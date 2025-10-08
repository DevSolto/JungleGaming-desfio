import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface CurrentUserPayload {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export const CurrentUser = createParamDecorator(
  <T extends keyof CurrentUserPayload | undefined>(
    data: T,
    context: ExecutionContext,
  ): T extends keyof CurrentUserPayload
    ? CurrentUserPayload[T]
    : CurrentUserPayload | undefined => {
    if (context.getType() !== 'http') {
      return undefined as never;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();
    const user = request.user;

    if (!user) {
      return undefined as never;
    }

    if (data && typeof data === 'string') {
      return (user as CurrentUserPayload)[data] as never;
    }

    return user as never;
  },
);
