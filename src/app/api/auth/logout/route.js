import { clearAuthCookie, jsonOk } from '@/lib/auth';

/**
 * POST /api/auth/logout
 * Clears the auth cookie.
 */
export async function POST() {
  const res = jsonOk({ ok: true });
  clearAuthCookie(res);
  return res;
}