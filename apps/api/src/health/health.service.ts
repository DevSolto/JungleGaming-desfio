import { Injectable } from '@nestjs/common';
import { AuthGatewayService } from '../auth/auth-gateway.service';
import type { AuthPingResponse } from '@repo/types';

type DependencyHealth<T = unknown> = {
  status: 'ok' | 'error';
  latencyMs: number;
  details?: T;
  error?: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly authService: AuthGatewayService) {}

  async check() {
    const now = new Date().toISOString();

    const dependencies = {
      auth: await this.probe<AuthPingResponse>(() => this.authService.ping()),
    } satisfies Record<string, DependencyHealth>;

    const degraded = Object.values(dependencies).some(
      (dependency) => dependency.status === 'error',
    );

    return {
      status: degraded ? 'degraded' : 'ok',
      ts: now,
      services: {
        api: {
          status: 'ok' as const,
          latencyMs: 0,
          details: { ts: now },
        },
        ...dependencies,
      },
    };
  }

  private async probe<T>(
    factory: () => Promise<T>,
  ): Promise<DependencyHealth<T>> {
    const startedAt = process.hrtime.bigint();

    try {
      const details = await factory();
      return {
        status: 'ok',
        latencyMs: this.calculateLatency(startedAt),
        details,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: this.calculateLatency(startedAt),
        error: this.extractErrorMessage(error),
      };
    }
  }

  private calculateLatency(startedAt: bigint) {
    const diff = Number(process.hrtime.bigint() - startedAt);
    return diff / 1_000_000; // ns -> ms
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message?: unknown }).message);
    }

    return 'unknown error';
  }
}
