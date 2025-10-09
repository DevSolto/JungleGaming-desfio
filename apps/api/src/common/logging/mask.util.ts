import type { IncomingHttpHeaders } from 'http';

type PlainObject = Record<string, unknown>;

const MASKED_VALUE = '[REDACTED]';

const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'pass',
  'secret',
  'token',
  'refresh',
  'access',
  'api-key',
  'apikey',
];

const shouldMaskKey = (key: string): boolean =>
  SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive));

const maskValue = (): string => MASKED_VALUE;

const isPlainObject = (value: unknown): value is PlainObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const maskNestedValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(maskNestedValue);
  }

  if (isPlainObject(value)) {
    return maskObject(value);
  }

  return value;
};

const maskObject = (input: PlainObject): PlainObject => {
  const entries = Object.entries(input).map<[string, unknown]>(
    ([key, value]) => {
      if (shouldMaskKey(key)) {
        return [key, maskValue()];
      }

      if (Array.isArray(value)) {
        return [key, value.map(maskNestedValue)];
      }

      if (isPlainObject(value)) {
        return [key, maskObject(value)];
      }

      return [key, value];
    },
  );

  return Object.fromEntries(entries);
};

export const maskHeaders = (
  headers: IncomingHttpHeaders,
): Record<string, unknown> => {
  const normalizedHeaders = Object.entries(headers).reduce<PlainObject>(
    (acc, [key, value]) => {
      if (value === undefined) {
        return acc;
      }

      if (shouldMaskKey(key)) {
        acc[key] = maskValue();
        return acc;
      }

      if (Array.isArray(value)) {
        acc[key] = [...value];
        return acc;
      }

      acc[key] = value;
      return acc;
    },
    {},
  );

  return normalizedHeaders;
};

export const maskBody = (body: unknown): unknown => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(maskNestedValue);
  }

  return maskObject(body as PlainObject);
};
