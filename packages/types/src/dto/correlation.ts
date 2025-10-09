import { IsOptional, IsString } from "class-validator";

import type { CorrelationMetadata } from "../contracts/common/correlation.js";

export class CorrelatedDto implements CorrelationMetadata {
  @IsOptional()
  @IsString()
  requestId?: string;
}
