import { NextResponse } from 'next/server';
import { getTokenFromCookie, verifyToken } from '@/lib/auth';
import { rateLimit, clearOldBuckets } from '@/lib/ratelimit';

// Public paths that do not require auth
const PUBLIC_PATHS = ['/api/auth/register', '/api/auth/login', '/api/health'];

// Admin-only prefixes
const ADMIN_PREFIXES = ['/admin', '/api/admin', '/api/fleet', '/api/analytics', '/api/audit'];

// Customer-only prefixes (they can access their own stuff)
const CUSTOMER_PREFIXES = ['/customer'];

/**
 * Security response helper — sets the standard browser security headers.
 * Called after role checks so every response gets hardened headers.
 */
function applySecurityHeaders(response) {
  const res = response instanceof NextResponse ? response : response;
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (!res.headers.get('Cache-Control')) {
    res.headers.set('Cache-Control', 'no-store, must-revalidate');
  }
  return res;
}

/**
 * Role-based access control middleware.
 * Protects UI routes and API routes by role. Re-checks role in every
 * API handler too (defense in depth).
 */
export async function middleware(request) {
  clearOldBuckets();
  const { pathname } = request.nextUrl;

  // Skip static assets and Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return applySecurityHeaders(NextResponse.next());
  }

  const rawCookie = request.headers.get('cookie');
  const token = getTokenFromCookie(rawCookie);
  console.error('[M] path=' + request.nextUrl.pathname + ' cookie=' + String(rawCookie).slice(0, 120) + ' tok=' + (token ? 'ok' : 'null'));
  const payload = token ? verifyToken(token) : null;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isCustomerRoute = CUSTOMER_PREFIXES.some((p) => pathname.startsWith(p));
  const isApiRoute = pathname.startsWith('/api/');

  // Brute-force rate limit on login & register
  const rl = await rateLimit(request);
  if (rl && rl.limited) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests, please try again later.',
        retryAfter: rl.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.retryAfterSeconds),
        },
      }
    );
  }

  // Redirect unauthenticated users from protected routes to login (for UI routes)
  if (!payload && !isPublic && !isApiRoute) {
    const loginUrl = new URL('/login', request.url);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // For API routes, return JSON error instead of redirect
  if (!payload && !isPublic && isApiRoute) {
    return applySecurityHeaders(
      new NextResponse(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }

  // Redirect authenticated users away from login page
  if (payload && pathname === '/login') {
    return applySecurityHeaders(NextResponse.redirect(new URL('/customer/orders', request.url)));
  }

  // Enforce admin-only routes
  if (isAdminRoute && payload && payload.role !== 'grid_admin') {
    if (isApiRoute) {
      return applySecurityHeaders(
        new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }
    return applySecurityHeaders(NextResponse.redirect(new URL('/customer/orders', request.url)));
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
