import { Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

import { CorrelatedDto } from "./correlation.js";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
}

export type User = UserDTO;

export interface UserListFiltersDTO {
  search?: string;
  page?: number;
  limit?: number;
}

export type UserListFilters = UserListFiltersDTO;

export class ListUsersDto
  extends CorrelatedDto
  implements UserListFiltersDTO
{
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class ListUsersQueryDto implements UserListFiltersDTO {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class UserIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
