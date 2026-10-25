import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const service=readFileSync(new URL('../src/services/googlePlayBilling.service.ts',import.meta.url),'utf8');
test('an old replaced Play purchase cannot override a more recent active paid subscription',()=>{
  assert.match(service,/const newerRecurring = input\.plan !== 'LIFETIME'/);
  assert.match(service,/startDate: \{ gt: snapshot\.startDate \}/);
  assert.match(service,/NOT: \{ purchaseToken: input\.purchaseToken \}/);
  assert.match(service,/!activeLifetime && !newerRecurring/);
});
