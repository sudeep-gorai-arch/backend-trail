import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from '../src/middlewares/validate.middleware.ts';
import { categoryListQuery, createCategoryBody } from '../src/validations/category.validation.ts';
import { userListQuery, premiumBody } from '../src/validations/user.validation.ts';
import { wallpaperListQuery, createWallpaperBody } from '../src/validations/wallpaper.validation.ts';
import { verifyGooglePlayPurchaseBody } from '../src/validations/subscription.validation.ts';
import { downloadHistoryQuery } from '../src/validations/download.validation.ts';

test('Zod 4 parses false boolean filters without truthy string coercion', () => {
  assert.equal(categoryListQuery.parse({ active: 'false' }).active, false);
  assert.equal(categoryListQuery.parse({ active: 'true' }).active, true);
  assert.equal(userListQuery.parse({ premium: 'false' }).premium, false);
  assert.equal(userListQuery.parse({ premium: '1' }).premium, true);
  assert.equal(premiumBody.parse({ isPremium: 'false' }).isPremium, false);
  assert.equal(createCategoryBody.parse({ name: 'Nature', active: 'false' }).active, false);
  assert.equal(createCategoryBody.parse({ name: 'Nature' }).active, true);
  assert.equal(categoryListQuery.safeParse({ active: 'not-a-boolean' }).success, false);
  assert.equal(premiumBody.safeParse({ isPremium: 'not-a-boolean' }).success, false);
});

test('Zod 4 preserves wallpaper filter coercion and safe pagination', () => {
  const q = wallpaperListQuery.parse({ premium: 'false', featured: '0', limit: '25', offset: '2' });
  assert.equal(q.premium, false);
  assert.equal(q.featured, false);
  assert.equal(q.limit, 25);
  assert.equal(q.offset, 2);
  assert.equal(wallpaperListQuery.safeParse({ limit: '-5' }).success, false);
  assert.equal(downloadHistoryQuery.safeParse({ limit: 'Infinity' }).success, false);
});

test('Zod 4 preserves strict Google Play billing input validation', () => {
  assert.equal(verifyGooglePlayPurchaseBody.safeParse({
    plan: 'MONTHLY', productId: 'product', purchaseToken: 'token', packageName: 'com.flexiwalls.app',
  }).success, true);
  assert.equal(verifyGooglePlayPurchaseBody.safeParse({
    plan: 'FREE', productId: 'product', purchaseToken: 'token', packageName: 'com.flexiwalls.app',
  }).success, false);
  assert.equal(createWallpaperBody.safeParse({ title: 'test', categoryId: 'not-a-uuid' }).success, false);
});

test('validation middleware replaces Express query getter safely and formats errors', () => {
  const schema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });
  const req = {};
  Object.defineProperty(req, 'query', {
    configurable: true,
    enumerable: true,
    get: () => ({ limit: '3' }),
  });
  let nextError;
  validate({ query: schema })(req, {}, error => { nextError = error; });
  assert.equal(nextError, undefined);
  assert.equal(req.query.limit, 3);

  const invalid = { body: { value: 'wrong' } };
  let error;
  validate({ body: z.object({ value: z.number() }) })(invalid, {}, err => { error = err; });
  assert.equal(error?.statusCode, 400);
  assert.equal(error?.message, 'Validation failed');
  assert.ok(error?.details?.value?.length);
});
