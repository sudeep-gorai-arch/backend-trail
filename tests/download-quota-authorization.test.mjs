import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const download = readFileSync(new URL('../src/services/download.service.ts', import.meta.url), 'utf8');

test('free and guest daily downloads remain capped at five', () => {
  assert.match(download, /const FREE_DAILY_LIMIT = 5/);
  assert.match(download, /dailyCount >= FREE_DAILY_LIMIT/);
  assert.match(download, /isolationLevel: 'Serializable'/);
  assert.match(download, /clientRequestId/);
});

test('preflight does not return full-resolution download URLs before quota commit', () => {
  const preflight = download.split('  async preflight(input: DownloadAccessInput) {')[1].split('  async commit(input: CommitDownloadInput) {')[0];
  for (const field of ['downloadUrl', 'imageUrl', 'videoUrl', 'videoPreviewUrl']) {
    assert.match(preflight, new RegExp(field + ': null'));
  }
  assert.match(preflight, /getAccessState/);
});

test('quota increment and download row creation share the serializable transaction', () => {
  const commit = download.split('const commitOnce = async')[1].split('export const downloadService')[0];
  assert.match(commit, /tx\.download\.create/);
  assert.match(commit, /dailyDownloadCount: \{ increment: 1 \}/);
  assert.match(commit, /tx\.guest\.update/);
  assert.match(commit, /tx\.user\.update/);
});
