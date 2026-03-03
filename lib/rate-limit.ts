/**
 * In-memory rate limiting for login endpoints.
 * Configurable via env. Use Redis in production for multi-instance.
 */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const LOGIN_RATE_WINDOW_MS =
  parseInt(process.env.LOGIN_RATE_WINDOW_MS ?? '60000', 10) || 60000;
const MAX_LOGIN_ATTEMPTS =
  parseInt(process.env.MAX_LOGIN_ATTEMPTS ?? '10', 10) || 10;

export function checkLoginRateLimit(ip: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count++;
  return { allowed: true };
}
