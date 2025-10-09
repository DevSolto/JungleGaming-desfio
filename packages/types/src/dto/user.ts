import { IsOptional, IsString, IsUUID, IsNotEmpty } from "class-validator";

import { CorrelatedDto } from "./correlation.js";

export interface UserDTO {
  id: string;
  email: string;
  name: string;
}

export type User = UserDTO;

export interface UserListFiltersDTO {
  search?: string;
}

export type UserListFilters = UserListFiltersDTO;

export class ListUsersDto
  extends CorrelatedDto
  implements UserListFiltersDTO
{
  @IsOptional()
  @IsString()
  search?: string;
}

export class ListUsersQueryDto implements UserListFiltersDTO {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UserIdParamDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}
