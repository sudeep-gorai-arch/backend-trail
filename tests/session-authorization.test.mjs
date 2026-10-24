import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as sessionHelpers from '../src/utils/sessionIdentity.ts';
const activeSessionIdentity = sessionHelpers.activeSessionIdentity ?? sessionHelpers.default?.activeSessionIdentity;

const storedUser = { id: 'user-1', email: 'qa@example.invalid', role: { name: 'USER' } };

test('valid active session returns database identity', () => {
  assert.deepEqual(activeSessionIdentity({ sub: 'user-1' }, { isActive: true, user: storedUser }), storedUser);
});
test('logout/invalidation denies stale token', () => {
  assert.equal(activeSessionIdentity({ sub: 'user-1' }, { isActive: false, user: storedUser }), null);
});
test('deleted session rejects stale token', () => {
  assert.equal(activeSessionIdentity({ sub: 'user-1' }, null), null);
});
test('deleted account rejects stale token', () => {
  assert.equal(activeSessionIdentity({ sub: 'user-1' }, { isActive: true, user: null }), null);
});
test('session cannot be replayed against another user', () => {
  assert.equal(activeSessionIdentity({ sub: 'user-2' }, { isActive: true, user: storedUser }), null);
});
test('database identity overrides stale JWT identity and role', () => {
  const result = activeSessionIdentity({ sub: 'user-1', email: 'forged@example.invalid', role: 'ADMIN' }, { isActive: true, user: storedUser });
  assert.equal(result.email, 'qa@example.invalid');
  assert.equal(result.role?.name, 'USER');
});
test('null database role is not promoted to admin', () => {
  const result = activeSessionIdentity({ sub: 'user-1' }, { isActive: true, user: { id: 'user-1', email: storedUser.email } });
  assert.equal(result.role, null);
});
