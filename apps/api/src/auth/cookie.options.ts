// src/auth/cookie.options.ts
import { CookieOptions } from 'express';

export const buildRefreshCookieOptions = (maxAgeMs = 7 * 24 * 60 * 60 * 1000): CookieOptions => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? ('lax' as const) : ('lax' as const),
    path: '/api/auth',
    maxAge: maxAgeMs,
});
