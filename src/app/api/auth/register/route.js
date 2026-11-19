import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { validate, jsonOk, jsonError } from '@/lib/schemas';
import { signToken, setAuthCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/schemas';

/**
 * POST /api/auth/register
 * Body: { name, email, password, role? }
 * Returns: { user: { id, name, email, role } }
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const v = validate(body, registerSchema);
  if (!v.ok) return jsonError(400, 'Validation failed', v.errors);

  const { name, email, password, role = 'customer' } = v.data;

  // Check for existing email
  const existing = await query('SELECT user_id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return jsonError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, name, email, role`,
    [name, email, passwordHash, role]
  );

  const user = result.rows[0];
  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });
  const res = jsonOk({ user });
  setAuthCookie(res, token);
  return res;
}