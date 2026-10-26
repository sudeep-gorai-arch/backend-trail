/**
 * REAL Express/Prisma integration benchmark, 1,000 synthetic virtual sessions.
 * Only uses a locally bound HTTP server and ephemeral CI PostgreSQL.
 * Never uses actual Google Play, real accounts, production R2, or live Render.
 * This is a functionality/capacity baseline, NOT proof of live Render capacity.
 */
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import { performance } from 'node:perf_hooks';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const require = createRequire(import.meta.url);
const dbUrl = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1', '::1'].includes(dbUrl.hostname)) {
  throw new Error('Load test refuses to touch a database that is not local.');
}
if (process.env.NODE_ENV !== 'test') throw new Error('NODE_ENV must be test.');
if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_BASE64) {
  throw new Error('Never supply Play service account credentials to load tests.');
}

const appExport = require('../../dist/src/app.js');
const app = appExport.default || appExport;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sessions = [];
let server;
const agent = new http.Agent({ keepAlive: true, maxSockets: 160, maxFreeSockets: 80 });
const latencies = [];
const results = {};
let totalRequests = 0;
let unexpected = 0;
let peakActiveUsers = 0;
let activeUsers = 0;
let inFlight = 0;
let peakInFlight = 0;
const startedAt = new Date();
let durationMs = 0;
const securityChecks = {};

const percentile = p => {
  if (!latencies.length) return null;
  const index = Math.min(latencies.length - 1, Math.ceil((p / 100) * latencies.length) - 1);
  return Math.round(latencies[index] * 10) / 10;
};

async function seed() {
  const categoryId = randomUUID();
  await prisma.category.create({
    data: { id: categoryId, name: 'Load test', slug: 'qa-only', folderName: 'qa_only', active: true },
  });
  const wallpapers = Array.from({ length: 250 }, (_, i) => ({
    id: randomUUID(), categoryId, title: 'Load wallpaper ' + i, slug: 'load-' + i,
    mediaType: 'IMAGE', status: 'READY', isPremium: i >= 150,
    isFeatured: i % 3 === 0, originalPath: 'https://invalid.example/' + i + '/original.webp',
    displayPath: 'https://invalid.example/' + i + '/display.webp',
    thumbnailPath: 'https://invalid.example/' + i + '/thumb.webp',
    originalName: 'wallpaper.webp', fileName: 'wallpaper.webp',
    mimeType: 'image/webp', extension: 'webp', width: 2160, height: 3840,
    aspectRatio: 0.5625, originalSize: 1800000, displaySize: 350000, thumbnailSize: 50000,
    quality: 'UHD_4K', format: 'webp', active: true,
  }));
  await prisma.wallpaper.createMany({ data: wallpapers });

  const users = Array.from({ length: 400 }, (_, i) => ({
    id: randomUUID(),
    email: 'load-qa-' + i + '@example.invalid',
    username: 'Synthetic User ' + i,
    authProvider: 'GOOGLE',
    isPremium: i >= 300,
    premiumUntil: i >= 300 ? new Date(Date.now() + 30 * 86400000) : null,
  }));
  await prisma.user.createMany({ data: users });
  const now = new Date();
  await prisma.subscription.createMany({
    data: users.slice(300).map(u => ({
      userId: u.id, plan: 'MONTHLY', platform: 'RAZORPAY',
      status: 'PAID', startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 30 * 86400000), active: true,
    })),
  });
  const tokens = users.map(u => jwt.sign(
    { sub: u.id, email: u.email },
    process.env.JWT_SECRET,
    { expiresIn: '2h', jwtid: randomUUID() },
  ));
  await prisma.userSession.createMany({
    data: users.map((u, i) => ({ userId: u.id, token: tokens[i], isActive: true })),
  });

  for (let id = 0; id < 1000; id++) {
    const type = id < 600 ? 'guest' : id < 900 ? 'free' : 'premium';
    sessions.push({
      id, type,
      guestId: type === 'guest' ? randomUUID() : null,
      token: type === 'guest' ? null : tokens[id - 600],
      ip: '198.18.' + Math.floor((id + 1) / 256) + '.' + ((id + 1) % 256),
    });
  }
  return { freeWallpaper: wallpapers[2].id, premiumWallpaper: wallpapers[220].id };
}

function send(session, label, method, route, body, expectedStatus = 200) {
  return new Promise(resolve => {
    const start = performance.now();
    let settled = false;
    const finish = (status, error) => {
      if (settled) return;
      settled = true;
      inFlight--;
      totalRequests++;
      latencies.push(performance.now() - start);
      const bucket = (results[label] ||= { count: 0, unexpected: 0, statuses: {} });
      bucket.count++;
      bucket.statuses[String(status)] = (bucket.statuses[String(status)] || 0) + 1;
      if (status !== expectedStatus || error) {
        bucket.unexpected++;
        unexpected++;
      }
      resolve({ status, error });
    };
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const headers = {
      'X-Forwarded-For': session.ip,
      ...(session.token ? { Authorization: 'Bearer ' + session.token } : {}),
      ...(session.guestId ? { 'X-Guest-Id': session.guestId } : {}),
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
    };
    inFlight++;
    peakInFlight = Math.max(peakInFlight, inFlight);
    const req = http.request({
      hostname: '127.0.0.1', port: server.address().port, method,
      path: route, agent, headers,
    }, res => {
      // Consume response but never store private data / tokens in reports.
      res.on('data', () => {});
      res.on('end', () => finish(res.statusCode || 0, false));
      res.on('error', () => finish(0, true));
    });
    req.setTimeout(15000, () => req.destroy(new Error('request timeout')));
    req.on('error', () => finish(0, true));
    if (payload) req.write(payload);
    req.end();
  });
}

async function virtualUser(u, wallpaperIds) {
  // Spread the start across 1.5s but keep all 1,000 synthetic sessions active.
  await sleep(u.id * 1.5);
  activeUsers++;
  peakActiveUsers = Math.max(peakActiveUsers, activeUsers);
  const began = performance.now();
  const { freeWallpaper, premiumWallpaper } = wallpaperIds;
  const tasks = [
    ['categories', 'GET', '/api/categories'],
    ['wallpaper-list', 'GET', '/api/wallpapers?limit=12&offset=0&sort=latest'],
    ['featured', 'GET', '/api/wallpapers/featured'],
    ...(u.type === 'guest'
      ? [['guest-preflight', 'POST', '/api/downloads/public/preflight', { wallpaperId: freeWallpaper }, 200],
         ['guest-premium-denied', 'GET', '/api/wallpapers/' + premiumWallpaper, undefined, 403]]
      : [['profile', 'GET', '/api/users/me'],
         ['subscription-status', 'GET', '/api/subscriptions/status'],
         [u.type === 'premium' ? 'premium-preflight' : 'free-preflight',
          'POST', '/api/downloads/preflight',
          { wallpaperId: u.type === 'premium' ? premiumWallpaper : freeWallpaper }, 200]]),
  ];
  for (const [label, method, route, body, expected] of tasks) {
    await send(u, label, method, route, body, expected ?? 200);
    await sleep(15 + Math.floor(Math.random() * 60));
  }
  // A logged-in/guest virtual user remains in the active session for >= 5s.
  await sleep(Math.max(0, 5000 - (performance.now() - began)));
  activeUsers--;
}

try {
  const wallpapers = await seed();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const began = performance.now();
  await Promise.all(sessions.map(session => virtualUser(session, wallpapers)));
  durationMs = performance.now() - began;

  // SECURITY NEGATIVE CHECKS, ISOLATED ONLY: no media bytes downloaded.
  // Demonstrate whether repeated free preflight requests without /commit can
  // return a usable download URL more times than the daily free quota.
  const guest = sessions[0];
  const attempts = await Promise.all(
    Array.from({ length: 6 }, () => send(
      guest, 'quota-preflight-replay-probe', 'POST',
      '/api/downloads/public/preflight', { wallpaperId: wallpapers.freeWallpaper }, 200,
    )),
  );
  const guestDb = await prisma.guest.findUnique({ where: { id: guest.guestId } });
  securityChecks.uncommittedQuotaBypass = {
    sixPreflightsAllowed: attempts.every(x => x.status === 200),
    storedDownloadCount: guestDb?.dailyDownloadCount ?? null,
    vulnerable: attempts.every(x => x.status === 200) && guestDb?.dailyDownloadCount === 0,
  };

  // Anonymous users should not be able to upload wallpaper metadata/media.
  const unauthorized = await send(
    guest, 'unauthorized-admin-upload-probe', 'POST',
    '/api/wallpapers', {}, 401,
  );
  securityChecks.unauthorizedAdminUploadDenied = unauthorized.status === 401;

} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  agent.destroy();
  await prisma.$disconnect();
  await pool.end();
}
latencies.sort((a, b) => a - b);
const report = {
  test: 'Flexiwalls isolated real Express/Prisma API 1000 virtual users',
  productionTraffic: false,
  infrastructure: 'GitHub Actions Ubuntu runner + PostgreSQL 16 CI service; NOT Render Free',
  startedAt: startedAt.toISOString(),
  generatedAt: new Date().toISOString(),
  users: { total: 1000, guests: 600, free: 300, premium: 100, peakActiveVirtualUsers: peakActiveUsers },
  requests: {
    total: totalRequests, unexpected, failureRate: totalRequests ? unexpected / totalRequests : 0,
    throughputPerSecond: Math.round(totalRequests / (durationMs / 1000)),
    peakQueuedOrInflight: peakInFlight, statusesByScenario: results,
  },
  latencyMs: { p50: percentile(50), p95: percentile(95), p99: percentile(99), max: percentile(100) },
  durationSeconds: Math.round(durationMs / 10) / 100,
  securityChecks,
  processRssMiB: Math.round(process.memoryUsage().rss / 1048576),
  caveats: [
    'Backend endpoints and transient local PostgreSQL exercised; media bytes, AdMob, Android UI, Google Play and actual Render hardware are not.',
    'Synthetic JWTs belong only to disposable local accounts; no real personal information or purchases.',
    '1,000 simultaneous active virtual sessions does not mean 1,000 parallel downloads or 1,000 real devices.',
    'Observed latency includes GitHub Actions runner and HTTP-agent queuing, not mobile network latency.',
    'A separate staging test on production-equivalent hardware is mandatory before 1,000-user capacity can be certified.',
  ],
};
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/isolated-load-1000.json', JSON.stringify(report, null, 2));
const md = [
  '# Isolated 1,000 virtual-user load baseline',
  '',
  '**Not a production capacity certification. No live service contacted.**',
  '',
  '| Metric | Result |',
  '|---|---:|',
  '| Virtual users | ' + report.users.total + ' |',
  '| Maximum active VUs | ' + peakActiveUsers + ' |',
  '| Total API requests | ' + totalRequests + ' |',
  '| Unexpected HTTP results | ' + unexpected + ' |',
  '| Unexpected response rate | ' + (report.requests.failureRate * 100).toFixed(2) + '% |',
  '| p50 / p95 / p99 latency | ' + report.latencyMs.p50 + ' / ' + report.latencyMs.p95 + ' / ' + report.latencyMs.p99 + ' ms |',
  '| Maximum observed latency | ' + report.latencyMs.max + ' ms |',
  '| Request throughput | ' + report.requests.throughputPerSecond + ' req/s |',
  '| Total elapsed | ' + report.durationSeconds + ' s |',
  '',
  '## Scenarios',
  '',
  '| Scenario | Requests | Unexpected | HTTP status counts |',
  '|---|---:|---:|---|',
  ...Object.entries(results).sort().map(([k, v]) => '| ' + k + ' | ' + v.count + ' | ' + v.unexpected + ' | ' + JSON.stringify(v.statuses) + ' |'),
  '',
  '## Isolated security probes',
  '',
  '- Quota bypass by skipping commit: ' + (securityChecks.uncommittedQuotaBypass?.vulnerable ? '**CONFIRMED**' : '**Not observed**') + ' (6 accepted preflights; persisted count ' + securityChecks.uncommittedQuotaBypass?.storedDownloadCount + ').',
  '- Anonymous admin upload denied: ' + (securityChecks.unauthorizedAdminUploadDenied ? '**PASS**' : '**FAIL**') + '.',
  '',
  '## Scope limits',
  ...report.caveats.map(v => '- ' + v),
].join('\n');
writeFileSync('artifacts/isolated-load-1000.md', md);
console.log(md);
if (unexpected > 0) process.exitCode = 2;
