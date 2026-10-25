import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/googlePlayBilling.service.ts', import.meta.url), 'utf8');

test('verified lifetime access stops the preceding Google Play subscription renewals', () => {
  const start = source.indexOf("if (input.plan === 'LIFETIME') {");
  const end = source.indexOf('if (snapshot.acknowledgementPending)',start);
  assert.ok(start>=0&&end>start);
  const block=source.slice(start,end);
  assert.match(block,/platform: SubscriptionPlatform\.GOOGLE/);
  assert.match(block,/plan: \{ in: \['MONTHLY', 'YEARLY'\] \}/);
  assert.match(block,/assertAccountOwner\(userId, prior\.externalAccountIdentifiers/);
  assert.match(block,/googlePlayApi\.cancelSubscriptionRenewal\(previous\.purchaseToken\)/);
  assert.doesNotMatch(block,/prisma\.subscription\.delete/);
});

test('recovery includes an explicit pending cancellation warning if Play cannot stop old renewals', () => {
  assert.match(source,/let renewalCancellationPending = false/);
  assert.match(source,/renewalCancellationPending = true/);
  assert.match(source,/return \{ \.\.\.status, renewalCancellationPending \}/);
});
