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
export declare class ListUsersDto extends CorrelatedDto implements UserListFiltersDTO {
    search?: string;
    page?: number;
    limit?: number;
}
export declare class ListUsersQueryDto implements UserListFiltersDTO {
    search?: string;
    page?: number;
    limit?: number;
}
export declare class UserIdParamDto {
    id: string;
}
//# sourceMappingURL=user.d.ts.map