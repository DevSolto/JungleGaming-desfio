import type { UserDTO, UserListFiltersDTO } from "../../dto/user.js";
import type { CorrelatedMessage } from "../common/correlation.js";
export declare const USERS_MESSAGE_PATTERNS: {
    CREATE: "users.create";
    FIND_ALL: "users.findAll";
    FIND_BY_ID: "users.findById";
    UPDATE: "users.update";
    REMOVE: "users.remove";
};
export type UsersMessagePatterns = typeof USERS_MESSAGE_PATTERNS;
export type UsersMessagePattern = UsersMessagePatterns[keyof UsersMessagePatterns];
export type UsersFindAllPayload = CorrelatedMessage<UserListFiltersDTO>;
export type UsersFindAllResult = UserDTO[];
export type UsersFindByIdPayload = CorrelatedMessage<{ id: string }>;
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
