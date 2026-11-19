# 🔒 Security Hardening — DBMS

> This document catalogs the backend security features added after Phase 1, so they can be demonstrated to a professor during the walkthrough. Each feature lists its source location, a live verification path (login credentials + curl command), and the corresponding tests.

---

## 1. Role-Based Access Control (RBAC)

**Source:** `middleware.js`, route handlers (`src/app/api/*`).

### What it is
Customers can only see their own orders; only `grid_admin` roles access `/api/fleet/*` and `/api/analytics/*`. Every protected route requires a valid JWT — unauthenticated → `401 Not authenticated`; non-admin → `403 Forbidden`. Role re-checked inside each handler for defense in depth.

### Verification
1. Log in as customer (`rahul.sharma@email.com` / `Customer@123`).
2. `curl http://localhost:3000/api/fleet/active -H 'Cookie: dg_token=<token>'` → expect `403 Forbidden`.
3. Log in as admin (`admin@dronegrid.in` / `Admin@123`) → `200 OK`, fleet data returned.

**Tests:** `tests/authz.test.js` — 3 cases covering both roles.

---

## 2. JWT Authentication via httpOnly Cookies

**Source:** `src/lib/auth.js`.

### What it is
JWT signed with `JWT_SECRET`, stored in an `httpOnly: true` cookie named `dg_token` so JavaScript can't read it (XSS-resistant). Routes extract tokens from Cookie header rather than localStorage.

### Verification
1. `POST /api/auth/login` with wrong creds → `401 Invalid email or password`; login response sets the cookie.
2. DevTools → Application → Cookies → check `httpOnly` flag is set on `dg_token`.

**Tests:** Covered indirectly by `authz.test.js` login path.

---

## 3. Sliding-Window IP Rate Limiting (brute-force protection)

**Source:** `middleware.js` — `rateLimit()`.

### What it is
Hits login (`/api/auth/login`) and register (`/api/auth/register`) only. Sliding 15-min window; max 30 requests per IP. After 30 → `429 Too Many Requests` with `Retry-After` header and JSON body.

### Verification
```bash
for i in $(seq 1 35); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"rahul.sharma@email.com","password":"WRONG"}';
done
# expect: 401 x 30, then 429 starting at request 31
```

**Tests:** `tests/ratelimit.test.js` (unit), `tests/authz.test.js` (integration: 30 failures then 429).

---

## 4. Security Response Headers

**Source:** `middleware.js` — `applySecurityHeaders()`; `next.config.js` — COOP/COEP block.

### What it is
Every response gets hardened headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Restricts browser sensors |
| `Cache-Control` | `no-store, must-revalidate` | Prevents stale sensitive data |

Plus `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` in `next.config.js`.

### Verification
1. Visit `https://example.com` in a browser. Confirm the browser blocks framing of your app (clickjack protection active).
2. DevTools → Network → select an HTML response → Headers tab → confirm all five headers listed above are present on every response.

**Note:** Covered implicitly by Next 14 middleware integration; documented for demo demonstration.

---

## 5. Append-Only Audit Log Table

**Source:** `db/postgres/schema.sql`, `src/lib/security.js`, `src/app/api/auth/login/route.js`.

### What it is
PostgreSQL `audit_log` table captures security-relevant actions: failed logins, order creations, role violations. Inserts happen automatically when login fails (no such email vs bad password paths). Table is append-only — no UPDATE/DELETE logic exposed by the app layer.

### Verification
1. Log in as admin (`admin@dronegrid.in` / `Admin@123`).
2. Call `GET /api/admin/audit?limit=20` with the admin cookie → returns JSON `{ entries }` with recent audit events newest first.
3. Review the JSON — entries include `actor`, `action`, `resource`, `status`, `detail`. A recently-failed login attempt (done during earlier demo steps) appears here as `login_failed`.

**Tests:** `tests/audit.test.js` — verifies endpoint auth, and that a single bad login writes an entry.

---

## 6. Admin Audit Endpoint (`/api/admin/audit`)

**Source:** `src/app/api/admin/audit/route.js`.

### What it is
Dedicated endpoint for the admin dashboard to view recent audit activity. Requires valid `grid_admin` JWT (defense in depth: RBAC enforced here AND inside the handler). Returns newest-first entries up to `limit` (default 100, capped at 500).

### Verification
```bash
curl "http://localhost:3000/api/admin/audit?limit=20" \
     -H 'Cookie: dg_token=<admin-jwt>'
```
Expected: JSON with `entries` array. Without the cookie → `401`; with a customer token → `403`.

**Tests:** `tests/audit.test.js` covers this endpoint.
