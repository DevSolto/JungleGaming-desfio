import { createAppLogger, type StructuredLogger } from "@repo/logger";
import { Client } from "pg";
import type { ClientConfig } from "pg";

const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_CONNECTION_TIMEOUT_MS = 3_000;

export interface WaitForDatabaseOptions {
  connectionString: string;
  initialDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  connectionTimeoutMs?: number;
  logger?: StructuredLogger;
}

export type ResolvedWaitForDatabaseOptions = Omit<
  WaitForDatabaseOptions,
  "logger"
>;

const isPgClientConstructor = (value: unknown): value is new (
  config: ClientConfig,
) => { connect(): Promise<void>; end(): Promise<void> } =>
  typeof value === "function";

const defaultLogger = createAppLogger({ name: "database-bootstrap" }).withContext({
  scope: "waitForDatabase",
});

export const parsePositiveInt = (
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

export const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const waitForDatabase = async ({
  connectionString,
  initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
  logger = defaultLogger,
}: WaitForDatabaseOptions): Promise<void> => {
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      const clientCtor: unknown = Client;

      if (!isPgClientConstructor(clientCtor)) {
        throw new TypeError("Invalid PostgreSQL client constructor.");
      }

      const client = new clientCtor({
        connectionString,
        connectionTimeoutMillis: connectionTimeoutMs,
      });

      await client.connect();
      await client.end();

      logger.log("Successfully connected to PostgreSQL.", {
        attempt,
      });
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        logger.error(
          "Exhausted all attempts to reach PostgreSQL.",
          error,
          {
            attempt,
            maxAttempts,
          },
        );
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("PostgreSQL connection attempt failed.", {
        attempt,
        delayMs,
        errorMessage,
      });

      await delay(delayMs);
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }
};

const getBootstrapEnvValue = (
  env: NodeJS.ProcessEnv,
  suffix: string,
  prefix?: string,
) => {
  const prefixedKey = prefix ? `${prefix}${suffix}` : undefined;
  const prefixedValue = prefixedKey ? env[prefixedKey] : undefined;

  return prefixedValue ?? env[suffix];
};

export const resolveWaitForDatabaseOptions = (
  env: NodeJS.ProcessEnv,
  connectionString: string,
  prefix?: string,
): ResolvedWaitForDatabaseOptions => ({
  connectionString,
  initialDelayMs: parsePositiveInt(
    getBootstrapEnvValue(
      env,
      "DATABASE_BOOTSTRAP_INITIAL_DELAY_MS",
      prefix,
    ),
    DEFAULT_INITIAL_DELAY_MS,
  ),
  maxDelayMs: parsePositiveInt(
    getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_MAX_DELAY_MS", prefix),
    DEFAULT_MAX_DELAY_MS,
  ),
  maxAttempts: parsePositiveInt(
    getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_MAX_ATTEMPTS", prefix),
    DEFAULT_MAX_ATTEMPTS,
  ),
  connectionTimeoutMs: parsePositiveInt(
    getBootstrapEnvValue(
      env,
      "DATABASE_BOOTSTRAP_CONNECTION_TIMEOUT_MS",
      prefix,
    ),
    DEFAULT_CONNECTION_TIMEOUT_MS,
  ),
});

export const __TESTING__ = {
  DEFAULT_INITIAL_DELAY_MS,
  DEFAULT_MAX_DELAY_MS,
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_CONNECTION_TIMEOUT_MS,
};
