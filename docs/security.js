/**
 * Helper to display the security-hardening section of the README.
 * Usage: `node -e "import('./docs/security.js').then(m => m.readme())"`
 */
export function readme() {
  console.log(`
# 🔒 Security Hardening
## Demo verification checklist (after running Demo Steps 1–7)

| Step | What to do | What to expect | Source |
|------|-----------|----------------|-------|
| a | Login as customer with wrong password, 35 times rapidly | First 30 → 401; 31st+ → 429 with Retry-After header | middleware.js `rateLimit()` |
| b | Log in as admin → GET /api/admin/audit?limit=20 | JSON `{ entries }` with recent login failures visible | src/app/api/admin/audit/route.js |
| c | DevTools → Network → select protected page → Headers tab | X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Cache-Control: no-store | middleware.js `applySecurityHeaders()` |
| d | Visit https://example.com in browser | Browser blocks framing of your app (clickjacking) | next.config.js COOP/COEP + X-Frame-Options |
| e | DevTools → Application → Cookies → check `dg_token` | httpOnly flag set true | src/lib/auth.js `setAuthCookie()` |
| f | Verify tests pass via `npm test` | All 21/21 pass (6 new security cases) | tests/security.test.js, ratelimit.test.js, audit.test.js |
`);
}
