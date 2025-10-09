import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";

import { LoggerService as NestLoggerService } from "@nestjs/common";
import pino, {
  DestinationStream,
  Logger as PinoLogger,
  LoggerOptions,
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

    return payload;
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
  const { destination, formatters, timestamp, level, base, ...rest } = options;

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

  const instance = destination
    ? pino(finalOptions, destination)
    : pino(finalOptions);

  return new AppLoggerService(instance);
};

export type { PinoLogger };
