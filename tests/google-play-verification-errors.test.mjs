import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyGooglePlayHttpError } from '../src/utils/googlePlayErrors.ts';

test('Google Play permission error reports backend misconfiguration', () => {
  const result = classifyGooglePlayHttpError(403);
  assert.equal(result.statusCode, 503);
  assert.match(result.message, /service account permissions/);
});

test('missing purchase cannot be counted as valid', () => {
  const result = classifyGooglePlayHttpError(404);
  assert.equal(result.statusCode, 400);
  assert.match(result.message, /could not find this purchase/);
});

test('temporary Google Play outage asks to retry restore without repurchasing', () => {
  for (const status of [429, 500, 503]) {
    const result = classifyGooglePlayHttpError(status);
    assert.equal(result.statusCode, 503);
    assert.match(result.message, /do not purchase again/);
  }
});

test('API errors never contain tokens, response bodies, or secrets', () => {
  const api = readFileSync(new URL('../src/config/googlePlay.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(api, /response\.text\(\)/);
  assert.match(api, /classifyGooglePlayHttpError\(response\.status\)/);
});

test('failed Google Play acknowledgement does not undo persisted entitlement', () => {
  const service = readFileSync(new URL('../src/services/googlePlayBilling.service.ts', import.meta.url), 'utf8');
  const verification = service.slice(service.indexOf('async verifyAndActivate('), service.indexOf('async syncActivePurchase('));
  assert.ok(verification.indexOf('await persistEntitlement(') < verification.indexOf('await acknowledge('));
  assert.match(verification, /catch \{/);
  assert.match(verification, /return subscriptionService\.status\(userId\)/);
});
