/**
 * CSRF protection via origin/referer check for state-changing requests.
 * SameSite=Strict on cookies provides primary protection; this adds defense in depth.
 * Skips check when behind proxy without forwarded headers.
 */
export function validateCsrf(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';

  if (!host) return true;

  const allowedOrigin = `${proto === 'https' ? 'https' : 'http'}://${host.split(',')[0].trim()}`;

  if (origin) {
    try {
      const o = new URL(origin).origin;
      if (o !== allowedOrigin) return false;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      const r = new URL(referer).origin;
      if (r !== allowedOrigin) return false;
    } catch {
      return false;
    }
  }
  return true;
}
