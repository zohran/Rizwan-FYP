import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken, COOKIE_NAME } from './auth';
import { createAlert } from './create-alert';

export type AuthResult =
  | { authenticated: true; userId: string; role: string }
  | { authenticated: false };

export async function getAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return { authenticated: false };
  }

  try {
    const decoded = verifyAccessToken(token);
    return {
      authenticated: true,
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return { authenticated: false };
  }
}

/**
 * Requires admin auth. If not admin, creates unauthorized_access alert and returns 401 response.
 * Use in admin API routes. Returns null when authorized.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const auth = await getAuth();
  if (auth.authenticated && auth.role === 'admin') {
    return null;
  }
  const msg = auth.authenticated
    ? `User ${auth.userId} (${auth.role}) attempted unauthorized admin access`
    : 'Unauthorized access attempt (no valid token)';
  try {
    await createAlert({
      type: 'unauthorized_access',
      message: msg,
      userId: auth.authenticated ? auth.userId : undefined,
    });
  } catch (e) {
    console.error('Failed to create unauthorized alert:', e);
  }
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
