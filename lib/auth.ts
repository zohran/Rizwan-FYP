import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';
import type { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback-secret-change-in-production';
const JWT_EXPIRY = '15m';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const COOKIE_NAME = IS_PRODUCTION ? '__Host-session_token' : 'session_token';
const COOKIE_MAX_AGE = 15 * 60; // 15 minutes in seconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateAccessToken(
  userId: string,
  role: string
): string {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyAccessToken(token: string): JwtPayload & { userId: string; role: string } {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & {
    userId: string;
    role: string;
  };
  return decoded;
}

export function createAuthCookie(token: string): string {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearAuthCookie(): string {
  return serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  return parse(cookieHeader ?? '');
}

export function getTokenFromCookies(cookieHeader: string): string | undefined {
  const cookies = parseCookies(cookieHeader);
  return cookies[COOKIE_NAME];
}
