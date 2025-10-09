export interface CorrelationMetadata {
  requestId?: string;
}

export type CorrelatedMessage<T> = T & CorrelationMetadata;
