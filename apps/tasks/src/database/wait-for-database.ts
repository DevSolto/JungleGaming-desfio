import {
  resolveWaitForDatabaseOptions as sharedResolveWaitForDatabaseOptions,
  waitForDatabase as sharedWaitForDatabase,
  type ResolvedWaitForDatabaseOptions as SharedResolvedWaitForDatabaseOptions,
  type WaitForDatabaseOptions as SharedWaitForDatabaseOptions,
} from '@repo/types/utils/database';
import { createAppLogger, type StructuredLogger } from '@repo/logger';

const defaultLogger = createAppLogger({ name: 'tasks-service' }).withContext({
  service: 'tasks-service',
  context: 'wait-for-database',
});

export type WaitForDatabaseOptions = SharedWaitForDatabaseOptions;
export type ResolvedWaitForDatabaseOptions = SharedResolvedWaitForDatabaseOptions;

export const waitForDatabase = async (
  options: SharedWaitForDatabaseOptions,
  logger: StructuredLogger = defaultLogger,
): Promise<void> => {
  await sharedWaitForDatabase({
    ...options,
    logger,
  });
};

export const resolveWaitForDatabaseOptions = (
  env: NodeJS.ProcessEnv,
  connectionString: string,
): SharedResolvedWaitForDatabaseOptions =>
  sharedResolveWaitForDatabaseOptions(env, connectionString, 'TASKS_');
