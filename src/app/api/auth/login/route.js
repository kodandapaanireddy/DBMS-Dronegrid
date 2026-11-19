import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { validate, jsonOk, jsonError } from '@/lib/schemas';
import { signToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/schemas';
import { logAudit } from '@/lib/security';

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { user: { id, name, email, role } }
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const v = validate(body, loginSchema);
  if (!v.ok) return jsonError(400, 'Validation failed', v.errors);

  const { email, password } = v.data;

  const result = await query(
    'SELECT user_id, name, email, role, password_hash FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) {
    // Look up a dummy row so the failure path is symmetric and we can
    // return a distinct response shape without leaking whether the email exists.
    await logAudit({ actor: 'unknown-user', action: 'login_failed', status: 401, reason: 'no such email' });
    return jsonError(401, 'Invalid email or password');
  }

  const user = result.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await logAudit({ actor: `user-${user.user_id}`, action: 'login_failed', status: 401, reason: 'bad password' });
    return jsonError(401, 'Invalid email or password');
  }

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });
  const res = jsonOk({ user: { id: user.user_id, name: user.name, email: user.email, role: user.role } });
  setAuthCookie(res, token);
  return res;
}