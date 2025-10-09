import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { runWithRequestContext } from '@repo/logger';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existingRequestId = req.header('x-request-id');
    const requestId =
      existingRequestId && existingRequestId.trim().length > 0
        ? existingRequestId
        : nanoid();

    res.setHeader('x-request-id', requestId);

    runWithRequestContext({ requestId }, () => {
      next();
    });
  }
}
