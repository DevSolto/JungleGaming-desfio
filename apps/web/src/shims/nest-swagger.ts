export interface ApiPropertyOptions {
  [key: string]: unknown;
}

export function ApiProperty(_options?: ApiPropertyOptions): PropertyDecorator {
  return () => undefined;
}
