import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { googlePlayStableOrderId } from '../src/utils/googlePlayOrderIdentity.ts';

test('stable subscription identity is derived from purchase token, not renewal order', () => {
  const a = googlePlayStableOrderId('play-token-a');
  assert.equal(a, googlePlayStableOrderId('play-token-a'));
  assert.notEqual(a, googlePlayStableOrderId('play-token-b'));
  assert.match(a, /^google_[a-f0-9]{48}$/);
});

test('Google Play subscription renewal does not overwrite its unique orderId', () => {
  const source = readFileSync(new URL('../src/services/googlePlayBilling.service.ts', import.meta.url), 'utf8');
  const persistence = source.split('    const subscription = existingToken')[1].split('    const notes = {')[0];
  assert.doesNotMatch(persistence, /orderId:\s*snapshot\.orderId/);
  assert.equal((persistence.match(/orderId:\s*tokenOrderId\(input\.purchaseToken\)/g) ?? []).length, 2);
  assert.match(source, /const duplicateOrder = await prisma\.payment\.findUnique/);
  assert.match(source, /duplicateOrder\.subscriptionId \?\? subscription\.id/);
});
