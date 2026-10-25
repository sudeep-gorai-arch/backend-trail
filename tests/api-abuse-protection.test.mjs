import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../src/middlewares/rateLimit.middleware.ts';
import { validatedGuestId } from '../src/utils/guestIdentity.ts';
import { readFileSync } from 'node:fs';

test('a realistic guest UUID works and forged/oversized identifiers are rejected', () => {
  assert.equal(validatedGuestId('B8298888-12BA-4BF5-8212-CA02B8C7A003'), 'b8298888-12ba-4bf5-8212-ca02b8c7a003');
  assert.equal(validatedGuestId(undefined), null);
  for (const invalid of ['anonymous', 'a'.repeat(2048), '../something', '']) {
    if (invalid) assert.throws(() => validatedGuestId(invalid));
  }
});

test('same source gets 429 at threshold; different source has independent allowance', () => {
  const limit = rateLimit('test-security-20261025', { windowMs: 60000, max: 2 });
  const calls = [];
  const mock = (ip) => {
    const headers = {};
    let statusCode = 200;
    const res = {
      setHeader: (name, value) => { headers[name] = value; },
      status: code => { statusCode = code; return res; },
      json: obj => { calls.push({ ip, statusCode, obj, headers }); return res; },
    };
    let next = false;
    limit({ ip, socket: {remoteAddress:ip} }, res, () => {next = true;});
    return { next, statusCode, headers };
  };
  assert.equal(mock('192.0.2.25').next, true);
  assert.equal(mock('192.0.2.25').next, true);
  const blocked = mock('192.0.2.25');
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
  assert.equal(mock('192.0.2.26').next, true);
  assert.equal(calls[0].obj.success, false);
});

test('sensitive paths are rate-limited and legacy metrics cannot be spammed unbounded', () => {
  const root = new URL('../src/routes/', import.meta.url);
  const auth = readFileSync(new URL('auth.routes.ts', root), 'utf8');
  const download = readFileSync(new URL('download.routes.ts', root), 'utf8');
  const wallpaper = readFileSync(new URL('wallpaper.routes.ts', root), 'utf8');
  assert.match(auth, /rateLimit\('login'/);
  assert.match(auth, /rateLimit\('google-login'/);
  assert.match(download, /rateLimit\('downloads'/);
  assert.match(wallpaper, /rateLimit\("legacy-view-counter"/);
  assert.match(wallpaper, /rateLimit\("legacy-download-counter"/);
});

test('no duplicate purchase tokens are stored as payment receipts', () => {
  const service = readFileSync(new URL('../src/services/googlePlayBilling.service.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(service, /receipt:\s*input\.purchaseToken/);
  assert.match(service, /receipt:\s*tokenOrderId\(input\.purchaseToken\)/);
});
