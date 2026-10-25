import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { googlePlayCancellationBody } from '../src/validations/subscription.validation.ts';

const source = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const reasons = [
  'CANCEL_SURVEY_REASON_NOT_ENOUGH_USAGE',
  'CANCEL_SURVEY_REASON_TECHNICAL_ISSUES',
  'CANCEL_SURVEY_REASON_COST_RELATED',
  'CANCEL_SURVEY_REASON_FOUND_BETTER_APP',
  'CANCEL_SURVEY_REASON_OTHERS',
];

test('only one known feedback reason is accepted; never accept a purchase token', () => {
  for (const reason of reasons) {
    assert.deepEqual(googlePlayCancellationBody.parse({ reason }), { reason });
  }
  assert.equal(googlePlayCancellationBody.safeParse({ reason: 'CANCEL_SURVEY_REASON_UNKNOWN' }).success, false);
  assert.equal(googlePlayCancellationBody.safeParse({ reason: reasons[0], purchaseToken: 'untrusted' }).success, false);
});

test('in-app cancellation is authenticated and scoped by logged-in user', () => {
  const routes = source('../src/routes/subscription.routes.ts');
  const service = source('../src/services/googlePlayBilling.service.ts');
  assert.ok(routes.indexOf('router.use(authenticate)') < routes.indexOf("'/google-play/cancel'"));
  assert.match(service, /userId,/);
  assert.match(service, /platform: SubscriptionPlatform\.GOOGLE/);
  assert.match(service, /plan: \{ in: \['MONTHLY', 'YEARLY'\] \}/);
  assert.match(service, /assertAccountOwner\(userId, purchase\.externalAccountIdentifiers/);
  assert.doesNotMatch(service.slice(service.indexOf('async cancelRenewal('), service.indexOf('async syncActivePurchase(')), /prisma\.subscription\.delete/);
});

test('Google API request stops renewals rather than revoking paid access', () => {
  const api = source('../src/config/googlePlay.ts');
  assert.match(api, /subscriptionsv2\/tokens\/.*:cancel/);
  assert.match(api, /USER_REQUESTED_STOP_RENEWALS/);
  assert.doesNotMatch(api, /DEVELOPER_REQUESTED_STOP_PAYMENTS/);
});
