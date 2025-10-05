import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ApiTags } from '@nestjs/swagger';
import { AUTH_MESSAGE_PATTERNS } from '@repo/types';
import type { AuthPingResponse } from '@repo/types';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @MessagePattern(AUTH_MESSAGE_PATTERNS.PING)
  ping(): AuthPingResponse {
    return { status: 'ok', ts: new Date().toISOString() };
  }
}
