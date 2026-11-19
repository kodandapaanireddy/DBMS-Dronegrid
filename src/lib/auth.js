import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-min-32-chars';
const COOKIE_NAME = 'dg_token';

// Re-export jsonOk and jsonError from schemas for backward compatibility
export { jsonOk, jsonError } from './schemas.js';

/**
 * Sign a JWT with user id, email, role.
 * @param {object} payload
 * @param {number} payload.userId
 * @param {string} payload.email
 * @param {string} payload.role
 * @param {string} [expiresIn='7d']
 * @returns {string}
 */
export function signToken({ userId, email, role }, expiresIn = '7d') {
  return sign({ userId, email, role }, JWT_SECRET, { expiresIn });
}

/**
 * Verify a JWT and return its payload.
 * @param {string} token
 * @returns {object|null}
 */
export function verifyToken(token) {
  try {
    return verify(token, JWT_SECRET);
  } catch (_e) {
    return null;
  }
}

/**
 * Get the JWT from the httpOnly cookie header.
 * @param {string} cookieHeader - value of Cookie header.
 * @returns {string|null}
 */
export function getTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Set auth cookie on a Next Response.
 * @param {Response} res
 * @param {string} token
 */
export function setAuthCookie(res, token) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Clear auth cookie.
 * @param {Response} res
 */
export function clearAuthCookie(res) {
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
}