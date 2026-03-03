/**
 * Consistent API error responses.
 * Avoids leaking stack traces or internal details in production.
 */
import { NextResponse } from 'next/server';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export function apiError(
  message: string,
  status: number = 500,
  opts?: { retryAfter?: number }
): NextResponse {
  const headers = new Headers();
  if (opts?.retryAfter) {
    headers.set('Retry-After', String(opts.retryAfter));
  }
  return NextResponse.json(
    { error: message },
    { status, headers }
  );
}

export function apiValidationError(details: unknown, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', details: IS_PRODUCTION ? undefined : details },
    { status }
  );
}
