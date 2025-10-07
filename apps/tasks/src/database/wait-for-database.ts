import { Logger } from '@nestjs/common';
import {
  resolveWaitForDatabaseOptions as sharedResolveWaitForDatabaseOptions,
  waitForDatabase as sharedWaitForDatabase,
  type ResolvedWaitForDatabaseOptions as SharedResolvedWaitForDatabaseOptions,
  type WaitForDatabaseOptions as SharedWaitForDatabaseOptions,
} from '@repo/types/utils/database';

const logger = new Logger('TasksDatabaseBootstrap');

export type WaitForDatabaseOptions = SharedWaitForDatabaseOptions;
export type ResolvedWaitForDatabaseOptions = SharedResolvedWaitForDatabaseOptions;

export const waitForDatabase = async (
  options: SharedWaitForDatabaseOptions,
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
