export interface LoggerLike {
    log(message: string): void;
    warn(message: string): void;
    error(message: string, error?: unknown): void;
}
export interface WaitForDatabaseOptions {
    connectionString: string;
    initialDelayMs?: number;
    maxDelayMs?: number;
    maxAttempts?: number;
    connectionTimeoutMs?: number;
    logger?: LoggerLike;
}
export type ResolvedWaitForDatabaseOptions = Omit<WaitForDatabaseOptions, "logger">;
export declare const parsePositiveInt: (value: string | undefined, fallback: number) => number;
export declare const delay: (ms: number) => Promise<void>;
export declare const waitForDatabase: ({ connectionString, initialDelayMs, maxDelayMs, maxAttempts, connectionTimeoutMs, logger, }: WaitForDatabaseOptions) => Promise<void>;
export declare const resolveWaitForDatabaseOptions: (env: NodeJS.ProcessEnv, connectionString: string, prefix?: string) => ResolvedWaitForDatabaseOptions;
export declare const __TESTING__: {
    DEFAULT_INITIAL_DELAY_MS: number;
    DEFAULT_MAX_DELAY_MS: number;
    DEFAULT_MAX_ATTEMPTS: number;
    DEFAULT_CONNECTION_TIMEOUT_MS: number;
};
//# sourceMappingURL=database.d.ts.map