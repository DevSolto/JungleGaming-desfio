export class AppLoggerService {
  log(): void {}
  warn(): void {}
  debug(): void {}
  error(): void {}
  verbose(): void {}
  fatal(): void {}
  withContext(): this {
    return this;
  }
  child(): this {
    return this;
  }
  setLogLevel(): void {}
  get level(): string {
    return 'debug';
  }
  get instance(): AppLoggerService {
    return this;
  }
}

export const createAppLogger = (): AppLoggerService => new AppLoggerService();

export const runWithRequestContext = <T>(_: unknown, callback: () => T): T => callback();

export const getCurrentRequestContext = (): undefined => undefined;
