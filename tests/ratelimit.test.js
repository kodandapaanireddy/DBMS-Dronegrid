import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rateLimit } from '../src/lib/ratelimit.js';

/**
 * Unit-test the exported rate-limit logic without depending on a live HTTP roundtrip.
 * The function signature is: rateLimit({ pathname, ip }) → { limited, remaining, resetAt, retryAfterSeconds } | null
 */
function makeRequest(pathname) {
  return {
    pathname,
    ip: '127.0.0.1',
  };
}

test('rateLimit returns null for non-rate-limited paths', async () => {
  const rl = await rateLimit(makeRequest('/api/orders/list'));
  assert.equal(rl, null);
});

test('rateLimit allows exactly MAX_REQUESTS then returns a 429 shape', async () => {
  const results = [];
  for (let i = 0; i < 35; i++) results.push(await rateLimit(makeRequest('/api/auth/login')));

  const allowedCount = results.filter((r) => !r.limited).length;
  assert.equal(allowedCount, 30, 'first 30 requests are allowed');

  const thirtieth = results[29]; // index 29 is the 30th request
  assert.equal(thirtieth.limited, false);

  const thirtyFirst = results[30];
  assert.equal(thirtyFirst.limited, true, '31st request is rate-limited');
  assert.equal(thirtyFirst.remaining, 0);
  assert.equal(thirtyFirst.retryAfterSeconds >= 1, true);
});
