import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV !== 'production';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ── Content Security Policy ───────────────────────────────────────────────
  // In dev, Next's webpack runtime still emits eval (app-pages-internals.js),
  // so we conditionally allow 'unsafe-eval' to avoid CSP violations.
  // In prod, we keep it strict.
  const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "'unsafe-eval'" : undefined]
    .filter(Boolean)
    .join(' ');

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://api.qrserver.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",                      // Clickjacking prevention
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);

  // ── Other security headers ────────────────────────────────────────────────
  res.headers.set('X-Content-Type-Options',    'nosniff');
  res.headers.set('X-Frame-Options',           'DENY');
  res.headers.set('X-XSS-Protection',          '1; mode=block');
  res.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()');
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // ── Remove server fingerprinting headers ─────────────────────────────────
  res.headers.delete('X-Powered-By');
  res.headers.delete('Server');

  return res;
}

export const config = {
  // Apply to all routes except static assets and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
