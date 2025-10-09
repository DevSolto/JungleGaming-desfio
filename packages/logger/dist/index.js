import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";
import pino, { stdTimeFunctions, } from "pino";
const requestContextStorage = new AsyncLocalStorage();
export const getCurrentRequestContext = () => requestContextStorage.getStore();
export const runWithRequestContext = (context, callback) => requestContextStorage.run(context, callback);
const stringifyMessage = (message) => {
    if (typeof message === "string") {
        return message;
    }
    if (message instanceof Error) {
        return message.message;
    }
    if (typeof message === "object") {
        try {
            return JSON.stringify(message);
        }
        catch {
            return inspect(message, { depth: 3 });
        }
    }
    if (typeof message === "undefined") {
        return "";
    }
    return String(message);
};
const normalizeError = (error) => {
    if (error instanceof Error) {
        return error;
    }
    if (error === undefined) {
        return undefined;
    }
    if (typeof error === "object") {
        return { ...error };
    }
    return { value: error };
};
const hasContextEntries = (context) => !!context && Object.keys(context).length > 0;
const isContextCandidate = (value) => typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Error);
const extractContext = (optionalParams) => {
    if (optionalParams.length === 0) {
        return undefined;
    }
    const [first] = optionalParams;
    return isContextCandidate(first) ? first : undefined;
};
export class AppLoggerService {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    log(message, ...optionalParams) {
        const context = extractContext(optionalParams);
        this.write("info", message, context);
    }
    warn(message, ...optionalParams) {
        const context = extractContext(optionalParams);
        this.write("warn", message, context);
    }
    debug(message, ...optionalParams) {
        const context = extractContext(optionalParams);
        this.write("debug", message, context);
    }
    verbose(message, ...optionalParams) {
        const context = extractContext(optionalParams);
        this.write("trace", message, context);
    }
    error(message, ...optionalParams) {
        let error;
        let context;
        if (optionalParams.length > 0) {
            const [first, second] = optionalParams;
            if (isContextCandidate(first)) {
                context = first;
                error = second;
            }
            else {
                error = first;
                context = isContextCandidate(second) ? second : undefined;
            }
        }
        this.write("error", message, context, error);
    }
    fatal(message, ...optionalParams) {
        const context = extractContext(optionalParams);
        const payload = this.buildLogPayload(context);
        const formattedMessage = stringifyMessage(message);
        if (hasContextEntries(payload)) {
            this.logger.fatal(payload, formattedMessage);
            return;
        }
        this.logger.fatal(formattedMessage);
    }
    withContext(context) {
        return new AppLoggerService(this.logger.child(context));
    }
    child(bindings) {
        return this.withContext(bindings);
    }
    setLogLevel(level) {
        this.logger.level = level ?? this.logger.level;
    }
    get level() {
        return this.logger.level;
    }
    get instance() {
        return this.logger;
    }
    write(level, message, context, error) {
        const payload = this.buildLogPayload(context, error);
        const formattedMessage = stringifyMessage(message);
        if (hasContextEntries(payload)) {
            this.logger[level](payload, formattedMessage);
            return;
        }
        this.logger[level](formattedMessage);
    }
    buildLogPayload(context, error) {
        const asyncContext = getCurrentRequestContext();
        const payload = {
            ...(asyncContext ?? {}),
            ...(context ?? {}),
        };
        const normalizedError = normalizeError(error);
        if (normalizedError !== undefined) {
            payload.err = normalizedError;
        }
        return payload;
    }
}
const resolveLogLevel = (providedLevel) => providedLevel ??
    process.env.APP_LOG_LEVEL ??
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");
export const createAppLogger = (options = {}) => {
    const { destination, formatters, timestamp, level, base, ...rest } = options;
    const finalOptions = {
        ...rest,
        base: base ?? undefined,
        level: resolveLogLevel(level),
        timestamp: timestamp ?? stdTimeFunctions.isoTime,
        formatters: {
            level(label) {
                return { level: label };
            },
            ...formatters,
        },
    };
    const instance = destination
        ? pino(finalOptions, destination)
        : pino(finalOptions);
    return new AppLoggerService(instance);
};
