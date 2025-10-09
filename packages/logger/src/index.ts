import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";

import { LoggerService as NestLoggerService } from "@nestjs/common";
import pino, {
  DestinationStream,
  Logger as PinoLogger,
  LoggerOptions,
  redactOptions,
  stdTimeFunctions,
} from "pino";

export type LogContext = Record<string, unknown>;

export interface StructuredLogger {
  log(message: unknown, context?: LogContext): void;
  warn(message: unknown, context?: LogContext): void;
  error(message: unknown, error?: unknown, context?: LogContext): void;
  debug(message: unknown, context?: LogContext): void;
  withContext(context: LogContext): StructuredLogger;
}

export interface RequestContext {
  requestId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export const getCurrentRequestContext = (): RequestContext | undefined =>
  requestContextStorage.getStore();

export const runWithRequestContext = <T>(
  context: RequestContext,
  callback: () => T,
): T => requestContextStorage.run(context, callback);

const MASKED_VALUE = "[REDACTED]";

const normalizeString = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const parseCommaSeparatedEnv = (value: string | undefined): string[] =>
  value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

const isSafePropertyKey = (value: string): boolean =>
  /^[A-Za-z_$][\w$]*$/.test(value);

const extractPathKeySegment = (path: string): string | undefined => {
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

const classifyEnvEntries = (entries: string[]) => {
  const safeKeys: string[] = [];
  const unsafePaths: string[] = [];
  const patternOverrides: string[] = [];

  for (const entry of entries) {
    patternOverrides.push(entry);

    const lastSegment = extractPathKeySegment(entry);
    if (lastSegment) {
      patternOverrides.push(lastSegment);
    }

    if (isSafePropertyKey(entry)) {
      safeKeys.push(entry);
    } else {
      unsafePaths.push(entry);
    }
  }

  return { safeKeys, unsafePaths, patternOverrides };
};

const { safeKeys: envSafeKeys, unsafePaths: envUnsafePaths, patternOverrides } =
  classifyEnvEntries(ENV_REDACT_ENTRIES);

const createSafeKeyPaths = (keys: string[]): string[] => {
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

  const paths = new Set<string>();

  for (const key of keys) {
    if (!key) {
      continue;
    }

    const variants = new Set<string>([key, key.toLowerCase()]);

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
        } else {
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

const createHeaderOnlyPaths = (keys: string[]): string[] => {
  const headerPrefixes = [
    "headers",
    "*.headers",
    "*.headers.*",
    "req.headers",
    "request.headers",
    "res.headers",
    "response.headers",
  ];

  const paths = new Set<string>();

  for (const key of keys) {
    if (!key) {
      continue;
    }

    const variants = new Set<string>([key, key.toLowerCase()]);

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

const DEFAULT_REDACT_PATHS = Array.from(
  new Set([
    ...createSafeKeyPaths([
      ...BASE_SENSITIVE_KEYS,
      ...envSafeKeys,
    ]),
    ...createHeaderOnlyPaths([
      ...HEADER_ONLY_SENSITIVE_KEYS,
    ]),
    ...envUnsafePaths,
  ]),
);

const DEFAULT_SENSITIVE_PATTERNS = new Set<string>(
  [
    ...BASE_SENSITIVE_KEYS,
    ...HEADER_ONLY_SENSITIVE_KEYS,
    "api-key",
    "apikey",
    ...patternOverrides,
  ]
    .map(normalizeString)
    .filter((pattern) => pattern.length > 0),
);


const stringifyMessage = (message: unknown): string => {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof Error) {
    return message.message;
  }

  if (typeof message === "object") {
    try {
      return JSON.stringify(message);
    } catch {
      return inspect(message, { depth: 3 });
    }
  }

  if (typeof message === "undefined") {
    return "";
  }

  return String(message);
};

const normalizeError = (error: unknown): unknown => {
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

type InternalLogLevel = "info" | "warn" | "error" | "debug" | "trace";

const hasContextEntries = (context?: LogContext): context is LogContext =>
  !!context && Object.keys(context).length > 0;

const isContextCandidate = (value: unknown): value is LogContext =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Error);

const extractContext = (optionalParams: unknown[]): LogContext | undefined => {
  if (optionalParams.length === 0) {
    return undefined;
  }

  const [first] = optionalParams;

  return isContextCandidate(first) ? (first as LogContext) : undefined;
};

const getPatternSet = (additional?: string[]): Set<string> => {
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

const shouldMaskKey = (key: string, patterns: Set<string>): boolean => {
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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

const maskValueRecursively = (value: unknown, patterns: Set<string>): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => maskValueRecursively(item, patterns));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, current]) => {
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

export const maskSensitiveFields = <T>(value: T, additionalPatterns?: string[]): T => {
  if (value === null || value === undefined) {
    return value;
  }

  const patterns = getPatternSet(additionalPatterns);

  if (Array.isArray(value)) {
    return maskValueRecursively(value, patterns) as T;
  }

  if (isPlainObject(value)) {
    return maskValueRecursively(value, patterns) as T;
  }

  return value;
};

const mergeRedactPaths = (
  provided?: LoggerOptions["redact"],
): LoggerOptions["redact"] | undefined => {
  if (DEFAULT_REDACT_PATHS.length === 0) {
    return provided;
  }

  const defaultConfig: redactOptions = {
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

export class AppLoggerService implements StructuredLogger, NestLoggerService {
  constructor(private readonly logger: PinoLogger) {}

  log(message: unknown, context?: LogContext): void;
  log(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    this.write("info", message, context);
  }

  warn(message: unknown, context?: LogContext): void;
  warn(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    this.write("warn", message, context);
  }

  debug(message: unknown, context?: LogContext): void;
  debug(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    this.write("debug", message, context);
  }

  verbose(message: unknown, context?: LogContext): void;
  verbose(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    this.write("trace", message, context);
  }

  error(message: unknown, error?: unknown, context?: LogContext): void;
  error(message: unknown, ...optionalParams: unknown[]): void {
    let error: unknown;
    let context: LogContext | undefined;

    if (optionalParams.length > 0) {
      const [first, second] = optionalParams;

      if (isContextCandidate(first)) {
        context = first;
        error = second;
      } else {
        error = first;
        context = isContextCandidate(second) ? (second as LogContext) : undefined;
      }
    }

    this.write("error", message, context, error);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    const context = extractContext(optionalParams);
    const payload = this.buildLogPayload(context);
    const formattedMessage = stringifyMessage(message);

    if (hasContextEntries(payload)) {
      this.logger.fatal(payload, formattedMessage);
      return;
    }

    this.logger.fatal(formattedMessage);
  }

  withContext(context: LogContext): AppLoggerService {
    return new AppLoggerService(this.logger.child(context));
  }

  child(bindings: LogContext): AppLoggerService {
    return this.withContext(bindings);
  }

  setLogLevel(level: LoggerOptions["level"]): void {
    this.logger.level = level ?? this.logger.level;
  }

  get level(): LoggerOptions["level"] {
    return this.logger.level;
  }

  get instance(): PinoLogger {
    return this.logger;
  }

  private write(
    level: InternalLogLevel,
    message: unknown,
    context?: LogContext,
    error?: unknown,
  ) {
    const payload = this.buildLogPayload(context, error);
    const formattedMessage = stringifyMessage(message);

    if (hasContextEntries(payload)) {
      this.logger[level](payload, formattedMessage);
      return;
    }

    this.logger[level](formattedMessage);
  }

  private buildLogPayload(context?: LogContext, error?: unknown): LogContext {
    const asyncContext = getCurrentRequestContext();
    const payload: LogContext = {
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

export interface CreateAppLoggerOptions
  extends Partial<Omit<LoggerOptions, "level">> {
  level?: LoggerOptions["level"];
  destination?: DestinationStream;
}

const resolveLogLevel = (
  providedLevel: LoggerOptions["level"] | undefined,
): LoggerOptions["level"] =>
  providedLevel ??
  (process.env.APP_LOG_LEVEL as LoggerOptions["level"]) ??
  (process.env.LOG_LEVEL as LoggerOptions["level"]) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

export const createAppLogger = (
  options: CreateAppLoggerOptions = {},
): AppLoggerService => {
  const { destination, formatters, timestamp, level, base, redact, ...rest } = options;

  const finalOptions: LoggerOptions = {
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

export type { PinoLogger };
