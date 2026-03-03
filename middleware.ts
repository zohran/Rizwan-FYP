import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_NAME } from '@/lib/auth';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
);

/** Allowed roles - used to prevent tampering; only these values are valid */
const ROLES = {
  ADMIN: 'admin',
  CLIENT: 'client',
} as const;

type Role = (typeof ROLES)[keyof typeof ROLES];

const ROUTES = {
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
  CLIENT: '/client',
  CLIENT_LOGIN: '/client/login',
  HOME: '/',
} as const;

async function decodeJWT(token: string): Promise<{ userId: string; role: Role } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Prevent role tampering: only accept known roles from verified JWT
    if (role !== ROLES.ADMIN && role !== ROLES.CLIENT) {
      return null;
    }

    return {
      userId: payload.userId as string,
      role: role as Role,
    };
  } catch {
    return null;
  }
}

function getRequiredRole(pathname: string): Role | null {
  if (pathname.startsWith(ROUTES.ADMIN) && pathname !== ROUTES.ADMIN_LOGIN) {
    return ROLES.ADMIN;
  }
  if (pathname.startsWith(ROUTES.CLIENT) && pathname !== ROUTES.CLIENT_LOGIN) {
    return ROLES.CLIENT;
  }
  return null;
}

function redirectToLogin(requiredRole: Role, url: string): NextResponse {
  const loginUrl = requiredRole === ROLES.ADMIN ? ROUTES.ADMIN_LOGIN : ROUTES.CLIENT_LOGIN;
  const response = NextResponse.redirect(new URL(loginUrl, url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const requiredRole = getRequiredRole(pathname);
  const isPublicRoute = pathname === ROUTES.HOME || pathname === ROUTES.ADMIN_LOGIN || pathname === ROUTES.CLIENT_LOGIN;

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Security headers (always applied)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Public routes: redirect logged-in users to their dashboard
  if (isPublicRoute && token) {
    const decoded = await decodeJWT(token);
    if (decoded) {
      if (pathname === ROUTES.HOME) {
        const redirect = decoded.role === ROLES.ADMIN ? `${ROUTES.ADMIN}/dashboard` : `${ROUTES.CLIENT}/dashboard`;
        return NextResponse.redirect(new URL(redirect, request.url));
      }
      if (pathname === ROUTES.ADMIN_LOGIN && decoded.role === ROLES.ADMIN) {
        return NextResponse.redirect(new URL(`${ROUTES.ADMIN}/dashboard`, request.url));
      }
      if (pathname === ROUTES.CLIENT_LOGIN && decoded.role === ROLES.CLIENT) {
        return NextResponse.redirect(new URL(`${ROUTES.CLIENT}/dashboard`, request.url));
      }
    }
  }

  // Protected routes
  if (requiredRole) {
    if (!token) {
      return redirectToLogin(requiredRole, request.url);
    }

    const decoded = await decodeJWT(token);

    if (!decoded) {
      return redirectToLogin(requiredRole, request.url);
    }

    // Role validation: reject if JWT role does not match required route role
    if (decoded.role !== requiredRole) {
      return redirectToLogin(requiredRole, request.url);
    }

    // Attach user to request for downstream handlers (e.g. API routes, Server Components)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-role', decoded.role);

    const protectedResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    protectedResponse.headers.set('X-Frame-Options', 'DENY');
    protectedResponse.headers.set('X-Content-Type-Options', 'nosniff');
    protectedResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return protectedResponse;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
