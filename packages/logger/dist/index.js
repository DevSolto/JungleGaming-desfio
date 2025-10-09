import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";
import pino, { stdTimeFunctions, } from "pino";
const requestContextStorage = new AsyncLocalStorage();
export const getCurrentRequestContext = () => requestContextStorage.getStore();
export const runWithRequestContext = (context, callback) => requestContextStorage.run(context, callback);
const MASKED_VALUE = "[REDACTED]";
const normalizeString = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const parseCommaSeparatedEnv = (value) => value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];
const isSafePropertyKey = (value) => /^[A-Za-z_$][\w$]*$/.test(value);
const extractPathKeySegment = (path) => {
    const sanitized = path.replace(/]/g, "");
    const segments = sanitized
        .split(".")
        .flatMap((segment) => segment.split("["))
        .map((segment) => segment.replace(/^['\"]/, "").replace(/['\"]$/, ""))
        .filter((segment) => segment.length > 0);
    if (segments.length === 0) {
        return undefined;
    }
    return segments[segments.length - 1];
};
const BASE_SENSITIVE_KEYS = [
    "password",
    "passwordHash",
    "password_hash",
    "pass",
    "secret",
    "token",
    "refreshToken",
    "refresh_token",
    "accessToken",
    "access_token",
    "authorization",
    "cookie",
    "cookies",
    "apiKey",
    "api_key",
];
const HEADER_ONLY_SENSITIVE_KEYS = ["set-cookie"];
const ENV_REDACT_ENTRIES = [
    ...parseCommaSeparatedEnv(process.env.APP_LOG_REDACT_EXTRA),
    ...parseCommaSeparatedEnv(process.env.LOG_REDACT_EXTRA),
];
const classifyEnvEntries = (entries) => {
    const safeKeys = [];
    const unsafePaths = [];
    const patternOverrides = [];
    for (const entry of entries) {
        patternOverrides.push(entry);
        const lastSegment = extractPathKeySegment(entry);
        if (lastSegment) {
            patternOverrides.push(lastSegment);
        }
        if (isSafePropertyKey(entry)) {
            safeKeys.push(entry);
        }
        else {
            unsafePaths.push(entry);
        }
    }
    return { safeKeys, unsafePaths, patternOverrides };
};
const { safeKeys: envSafeKeys, unsafePaths: envUnsafePaths, patternOverrides } = classifyEnvEntries(ENV_REDACT_ENTRIES);
const createSafeKeyPaths = (keys) => {
    const wildcardPrefixes = [
        "",
        "*",
        "*.*",
        "*.*.*",
        "*.*.*.*",
        "body",
        "body.*",
        "data",
        "data.*",
        "payload",
        "payload.*",
        "context",
        "context.*",
        "meta",
        "meta.*",
        "query",
        "query.*",
        "params",
        "params.*",
    ];
    const headerPrefixes = [
        "headers",
        "*.headers",
        "*.headers.*",
        "req.headers",
        "request.headers",
        "res.headers",
        "response.headers",
    ];
    const paths = new Set();
    for (const key of keys) {
        if (!key) {
            continue;
        }
        const variants = new Set([key, key.toLowerCase()]);
        for (const variant of variants) {
            if (!variant) {
                continue;
            }
            if (!isSafePropertyKey(variant)) {
                continue;
            }
            for (const prefix of wildcardPrefixes) {
                if (!prefix) {
                    paths.add(variant);
                }
                else {
                    paths.add(`${prefix}.${variant}`);
                }
            }
            for (const prefix of headerPrefixes) {
                paths.add(`${prefix}.${variant}`);
            }
        }
    }
    return Array.from(paths);
};
const createHeaderOnlyPaths = (keys) => {
    const headerPrefixes = [
        "headers",
        "*.headers",
        "*.headers.*",
        "req.headers",
        "request.headers",
        "res.headers",
        "response.headers",
    ];
    const paths = new Set();
    for (const key of keys) {
        if (!key) {
            continue;
        }
        const variants = new Set([key, key.toLowerCase()]);
        for (const variant of variants) {
            const escaped = variant.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            paths.add(`["${escaped}"]`);
            for (const prefix of headerPrefixes) {
                paths.add(`${prefix}["${escaped}"]`);
            }
        }
    }
    return Array.from(paths);
};
const DEFAULT_REDACT_PATHS = Array.from(new Set([
    ...createSafeKeyPaths([
        ...BASE_SENSITIVE_KEYS,
        ...envSafeKeys,
    ]),
    ...createHeaderOnlyPaths([
        ...HEADER_ONLY_SENSITIVE_KEYS,
    ]),
    ...envUnsafePaths,
]));
const DEFAULT_SENSITIVE_PATTERNS = new Set([
    ...BASE_SENSITIVE_KEYS,
    ...HEADER_ONLY_SENSITIVE_KEYS,
    "api-key",
    "apikey",
    ...patternOverrides,
]
    .map(normalizeString)
    .filter((pattern) => pattern.length > 0));
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
const getPatternSet = (additional) => {
    if (!additional || additional.length === 0) {
        return DEFAULT_SENSITIVE_PATTERNS;
    }
    const extended = new Set(DEFAULT_SENSITIVE_PATTERNS);
    for (const entry of additional) {
        const normalized = normalizeString(entry);
        if (normalized.length > 0) {
            extended.add(normalized);
        }
    }
    return extended;
};
const shouldMaskKey = (key, patterns) => {
    if (!key) {
        return false;
    }
    const normalizedKey = normalizeString(key);
    if (!normalizedKey) {
        return false;
    }
    for (const pattern of patterns) {
        if (normalizedKey.includes(pattern)) {
            return true;
        }
    }
    return false;
};
const isPlainObject = (value) => Object.prototype.toString.call(value) === "[object Object]";
const maskValueRecursively = (value, patterns) => {
    if (Array.isArray(value)) {
        return value.map((item) => maskValueRecursively(item, patterns));
    }
    if (isPlainObject(value)) {
        return Object.entries(value).reduce((acc, [key, current]) => {
            if (shouldMaskKey(key, patterns)) {
                acc[key] = MASKED_VALUE;
                return acc;
            }
            acc[key] = maskValueRecursively(current, patterns);
            return acc;
        }, {});
    }
    return value;
};
export const maskSensitiveFields = (value, additionalPatterns) => {
    if (value === null || value === undefined) {
        return value;
    }
    const patterns = getPatternSet(additionalPatterns);
    if (Array.isArray(value)) {
        return maskValueRecursively(value, patterns);
    }
    if (isPlainObject(value)) {
        return maskValueRecursively(value, patterns);
    }
    return value;
};
const mergeRedactPaths = (provided) => {
    if (DEFAULT_REDACT_PATHS.length === 0) {
        return provided;
    }
    const defaultConfig = {
        paths: DEFAULT_REDACT_PATHS,
        censor: MASKED_VALUE,
    };
    if (provided === undefined) {
        return defaultConfig;
    }
    if (Array.isArray(provided)) {
        const mergedPaths = Array.from(new Set([...provided, ...DEFAULT_REDACT_PATHS]));
        return {
            paths: mergedPaths,
            censor: MASKED_VALUE,
        };
    }
    if (typeof provided === "object" && provided !== null) {
        const existingPaths = Array.isArray(provided.paths) ? provided.paths : [];
        const mergedPaths = Array.from(new Set([...existingPaths, ...DEFAULT_REDACT_PATHS]));
        return {
            ...provided,
            paths: mergedPaths,
            censor: provided.censor ?? MASKED_VALUE,
        };
    }
    return defaultConfig;
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
        return maskSensitiveFields(payload);
    }
}
const resolveLogLevel = (providedLevel) => providedLevel ??
    process.env.APP_LOG_LEVEL ??
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");
export const createAppLogger = (options = {}) => {
    const { destination, formatters, timestamp, level, base, redact, ...rest } = options;
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
    const resolvedRedact = mergeRedactPaths(redact);
    if (resolvedRedact) {
        finalOptions.redact = resolvedRedact;
    }
    const instance = destination
        ? pino(finalOptions, destination)
        : pino(finalOptions);
    return new AppLoggerService(instance);
};
