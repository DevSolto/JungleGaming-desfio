import { Logger } from '@nestjs/common';
import { Client } from 'pg';
import type { ClientConfig } from 'pg';

const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5000;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_CONNECTION_TIMEOUT_MS = 3000;

const logger = new Logger('TasksDatabaseBootstrap');

interface PgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
}

type PgClientConstructor = new (config: ClientConfig) => PgClient;

const isPgClientConstructor = (value: unknown): value is PgClientConstructor =>
  typeof value === 'function';

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface WaitForDatabaseOptions {
  connectionString: string;
  initialDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  connectionTimeoutMs?: number;
}

export const waitForDatabase = async ({
  connectionString,
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
}: WaitForDatabaseOptions): Promise<void> => {
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      const clientCtor: unknown = Client;

      if (!isPgClientConstructor(clientCtor)) {
        throw new TypeError('Invalid PostgreSQL client constructor.');
      }

      const client = new clientCtor({
        connectionString,
        connectionTimeoutMillis: connectionTimeoutMs,
      });

      await client.connect();
      await client.end();

      logger.log(`Successfully connected to PostgreSQL on attempt ${attempt}.`);
      return;
    } catch (error: unknown) {
      if (attempt >= maxAttempts) {
        logger.error(
          'Exhausted all attempts to reach PostgreSQL.',
          error as Error,
        );
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        `Attempt ${attempt} to connect to PostgreSQL failed (${message}). Retrying in ${delayMs}ms...`,
      );

      await delay(delayMs);
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }
};

export const resolveWaitForDatabaseOptions = (
  env: NodeJS.ProcessEnv,
  connectionString: string,
): WaitForDatabaseOptions => ({
  connectionString,
  initialDelayMs: parsePositiveInt(
    env.TASKS_DATABASE_BOOTSTRAP_INITIAL_DELAY_MS ??
      env.DATABASE_BOOTSTRAP_INITIAL_DELAY_MS,
    DEFAULT_INITIAL_DELAY_MS,
  ),
  maxDelayMs: parsePositiveInt(
    env.TASKS_DATABASE_BOOTSTRAP_MAX_DELAY_MS ??
      env.DATABASE_BOOTSTRAP_MAX_DELAY_MS,
    DEFAULT_MAX_DELAY_MS,
  ),
  maxAttempts: parsePositiveInt(
    env.TASKS_DATABASE_BOOTSTRAP_MAX_ATTEMPTS ??
      env.DATABASE_BOOTSTRAP_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS,
  ),
  connectionTimeoutMs: parsePositiveInt(
    env.TASKS_DATABASE_BOOTSTRAP_CONNECTION_TIMEOUT_MS ??
      env.DATABASE_BOOTSTRAP_CONNECTION_TIMEOUT_MS,
    DEFAULT_CONNECTION_TIMEOUT_MS,
  ),
});
