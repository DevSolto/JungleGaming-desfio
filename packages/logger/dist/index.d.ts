import { LoggerService as NestLoggerService } from "@nestjs/common";
import { DestinationStream, Logger as PinoLogger, LoggerOptions } from "pino";
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
export declare const getCurrentRequestContext: () => RequestContext | undefined;
export declare const runWithRequestContext: <T>(context: RequestContext, callback: () => T) => T;
export declare const maskSensitiveFields: <T>(value: T, additionalPatterns?: string[]) => T;
export declare class AppLoggerService implements StructuredLogger, NestLoggerService {
    private readonly logger;
    constructor(logger: PinoLogger);
    log(message: unknown, context?: LogContext): void;
    warn(message: unknown, context?: LogContext): void;
    debug(message: unknown, context?: LogContext): void;
    verbose(message: unknown, context?: LogContext): void;
    error(message: unknown, error?: unknown, context?: LogContext): void;
    fatal(message: unknown, ...optionalParams: unknown[]): void;
    withContext(context: LogContext): AppLoggerService;
    child(bindings: LogContext): AppLoggerService;
    setLogLevel(level: LoggerOptions["level"]): void;
    get level(): LoggerOptions["level"];
    get instance(): PinoLogger;
    private write;
    private buildLogPayload;
}
export interface CreateAppLoggerOptions extends Partial<Omit<LoggerOptions, "level">> {
    level?: LoggerOptions["level"];
    destination?: DestinationStream;
}
export declare const createAppLogger: (options?: CreateAppLoggerOptions) => AppLoggerService;
export type { PinoLogger };
//# sourceMappingURL=index.d.ts.map