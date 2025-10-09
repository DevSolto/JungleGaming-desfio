import type { UserDTO, UserListFiltersDTO } from "../../dto/user.js";
import type { CorrelatedMessage } from "../common/correlation.js";
export declare const USERS_MESSAGE_PATTERNS: {
    readonly CREATE: "users.create";
    readonly FIND_ALL: "users.findAll";
    readonly FIND_BY_ID: "users.findById";
    readonly UPDATE: "users.update";
    readonly REMOVE: "users.remove";
};
export type UsersMessagePatterns = typeof USERS_MESSAGE_PATTERNS;
export type UsersMessagePattern = UsersMessagePatterns[keyof UsersMessagePatterns];
export type UsersFindAllPayload = CorrelatedMessage<UserListFiltersDTO>;
export type UsersFindAllResult = UserDTO[];
export type UsersFindByIdPayload = CorrelatedMessage<{
    id: string;
}>;
export type UsersFindByIdResult = UserDTO;
export interface UsersRpcContractMap {
    [USERS_MESSAGE_PATTERNS.FIND_ALL]: {
        payload: UsersFindAllPayload;
        response: UsersFindAllResult;
    };
    [USERS_MESSAGE_PATTERNS.FIND_BY_ID]: {
        payload: UsersFindByIdPayload;
        response: UsersFindByIdResult;
    };
}
//# sourceMappingURL=users.d.ts.map