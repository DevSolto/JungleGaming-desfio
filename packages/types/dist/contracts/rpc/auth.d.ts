import type { AuthLoginRequestDTO, AuthLoginResponseDTO, AuthLogoutResponseDTO, AuthPingResponseDTO, AuthRefreshRequestDTO, AuthRefreshResponseDTO, AuthRegisterRequestDTO, AuthRegisterResponseDTO } from "../../dto/auth.js";
export declare const AUTH_MESSAGE_PATTERNS: {
    readonly REGISTER: "auth.register";
    readonly LOGIN: "auth.login";
    readonly REFRESH: "auth.refresh";
    readonly LOGOUT: "auth.logout";
    readonly PING: "auth.ping";
};
export type AuthMessagePattern = (typeof AUTH_MESSAGE_PATTERNS)[keyof typeof AUTH_MESSAGE_PATTERNS];
export type AuthRegisterPayload = AuthRegisterRequestDTO;
export type AuthRegisterResult = AuthRegisterResponseDTO;
export type AuthLoginPayload = AuthLoginRequestDTO;
export type AuthLoginResult = AuthLoginResponseDTO;
export type AuthRefreshPayload = AuthRefreshRequestDTO;
export type AuthRefreshResult = AuthRefreshResponseDTO;
export type AuthLogoutPayload = {
    refreshToken: string;
};
export type AuthLogoutResult = AuthLogoutResponseDTO;
export type AuthPingPayload = Record<string, never>;
export type AuthPingResult = AuthPingResponseDTO;
export interface AuthRpcContractMap {
    [AUTH_MESSAGE_PATTERNS.REGISTER]: {
        payload: AuthRegisterPayload;
        response: AuthRegisterResult;
    };
    [AUTH_MESSAGE_PATTERNS.LOGIN]: {
        payload: AuthLoginPayload;
        response: AuthLoginResult;
    };
    [AUTH_MESSAGE_PATTERNS.REFRESH]: {
        payload: AuthRefreshPayload;
        response: AuthRefreshResult;
    };
    [AUTH_MESSAGE_PATTERNS.LOGOUT]: {
        payload: AuthLogoutPayload;
        response: AuthLogoutResult;
    };
    [AUTH_MESSAGE_PATTERNS.PING]: {
        payload: AuthPingPayload;
        response: AuthPingResult;
    };
}
//# sourceMappingURL=auth.d.ts.map