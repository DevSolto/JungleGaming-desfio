import { Client } from "pg";
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_CONNECTION_TIMEOUT_MS = 3_000;
const isPgClientConstructor = (value) => typeof value === "function";
const defaultLogger = {
    log: (message) => console.log(message),
    warn: (message) => console.warn(message),
    error: (message, error) => {
        if (error !== undefined) {
            console.error(message, error);
            return;
        }
        console.error(message);
    },
};
export const parsePositiveInt = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
export const delay = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
export const waitForDatabase = async ({ connectionString, initialDelayMs = DEFAULT_INITIAL_DELAY_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS, maxAttempts = DEFAULT_MAX_ATTEMPTS, connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS, logger = defaultLogger, }) => {
    let attempt = 0;
    let delayMs = initialDelayMs;
    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            const clientCtor = Client;
            if (!isPgClientConstructor(clientCtor)) {
                throw new TypeError("Invalid PostgreSQL client constructor.");
            }
            const client = new clientCtor({
                connectionString,
                connectionTimeoutMillis: connectionTimeoutMs,
            });
            await client.connect();
            await client.end();
            logger.log(`Successfully connected to PostgreSQL on attempt ${attempt}.`);
            return;
        }
        catch (error) {
            if (attempt >= maxAttempts) {
                logger.error("Exhausted all attempts to reach PostgreSQL.", error);
                throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`Attempt ${attempt} to connect to PostgreSQL failed (${message}). Retrying in ${delayMs}ms...`);
            await delay(delayMs);
            delayMs = Math.min(delayMs * 2, maxDelayMs);
        }
    }
};
const getBootstrapEnvValue = (env, suffix, prefix) => {
    const prefixedKey = prefix ? `${prefix}${suffix}` : undefined;
    const prefixedValue = prefixedKey ? env[prefixedKey] : undefined;
    return prefixedValue ?? env[suffix];
};
export const resolveWaitForDatabaseOptions = (env, connectionString, prefix) => ({
    connectionString,
    initialDelayMs: parsePositiveInt(getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_INITIAL_DELAY_MS", prefix), DEFAULT_INITIAL_DELAY_MS),
    maxDelayMs: parsePositiveInt(getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_MAX_DELAY_MS", prefix), DEFAULT_MAX_DELAY_MS),
    maxAttempts: parsePositiveInt(getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_MAX_ATTEMPTS", prefix), DEFAULT_MAX_ATTEMPTS),
    connectionTimeoutMs: parsePositiveInt(getBootstrapEnvValue(env, "DATABASE_BOOTSTRAP_CONNECTION_TIMEOUT_MS", prefix), DEFAULT_CONNECTION_TIMEOUT_MS),
});
export const __TESTING__ = {
    DEFAULT_INITIAL_DELAY_MS,
    DEFAULT_MAX_DELAY_MS,
    DEFAULT_MAX_ATTEMPTS,
    DEFAULT_CONNECTION_TIMEOUT_MS,
};
