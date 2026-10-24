# FlexiWalls release-readiness QA and security review

Date: 2026-10-24. Target repositories: `App`, `backend-trail`, `webapp-trail`.

## Evidence legend
- **PASS — simulated**: automated pure-logic test executed locally, without Play Billing, Android runtime or production modification.
- **PASS — source checks**: code and middleware placement checks executed against the GitHub branch.
- **PENDING — device/sandbox**: cannot be claimed without a device/emulator or billing sandbox.
- **OPEN**: risk requires architecture or follow-up work.

## Executed, non-destructive checks
- 7 backend session tests (active, revoked, deleted, wrong-user, stale role/email, no role) **PASS — simulated**.
- 5 mobile offline-session tests (timeout, network error, HTTP 503, HTTP 401, unknown transient error) **PASS — simulated**.
- 7 purchase gate tests (fast double tap, cancel/retry, slow billing response, duplicate purchase callback, distinct tokens, verification retry) **PASS — simulated**.
- 10 backend route/authorization source checks (public browsing and counters preserved; admin mutations protected; Google login validation and logs; active-session enforcement) **PASS — source checks**.
- **NOT EXECUTED:** billing purchases, device installation/reinstallation, Android UI, notification interactions, customer data deletion, media downloads, refunds.

## Device and sandbox acceptance matrix
| ID | Journey / adverse condition | Expected result | State |
|---|---|---|---|
| U01 | Install; launch with no login | Guest wallpaper previews load | PENDING — device |
| U02 | Sign in with Google | Correct account appears and token is securely stored | PENDING — device |
| U03 | Cancel Google sign-in | App remains responsive; no unwanted account created | PENDING — device |
| U04 | Launch with internet disabled | Cached session retains signed-in UI; server-only features degrade gracefully | PENDING — device |
| U05 | 15s+ latency/timeout during startup | No forced logout for transient network failure | PASS — simulated logic; device pending |
| U06 | Server returns 401 after revocation | Saved login cleared; app requests sign-in | PASS — simulated logic; device pending |
| U07 | Log out then replay old JWT | Backend rejects deactivated session | PASS — simulated helper; integration pending |
| U08 | Reinstall app, sign in with same Google account | Server-side favorites and premium entitlements restored | PENDING — device |
| U09 | Switch Google account | Old account's favorites/premium do not leak | PENDING — device |
| P01 | Tap Pay twice immediately | Only one purchase UI attempt opens | PASS — simulated gate; Play sandbox pending |
| P02 | Payment cancelled | No premium granted; purchase button re-enabled | PASS — gate test; Play sandbox pending |
| P03 | Payment pending | No premium until Play says purchased | PENDING — Play sandbox |
| P04 | Network disconnect during purchase verification | Retriable purchase; no double charge or double entitlement | PENDING — Play sandbox |
| P05 | Duplicate purchase-success callback | One in-flight verification per token | PASS — simulated gate; Play sandbox pending |
| P06 | Purchase succeeds, app force-stops before acknowledgement | Restore/retry verifies via Play API and acknowledges | PENDING — Play sandbox |
| P07 | Reinstall after premium purchase | Restore purchase on same Google account | PENDING — Play sandbox |
| P08 | Refund, pause, expire or cancel subscription | Premium changes based on verified Play entitlement | PENDING — Play sandbox |
| P09 | Paid order verified again / with changed payment ID | Idempotent same ID; mismatched ID rejected | PASS — source check; integration pending |
| D01 | Double tap download | One local asset and one download count | PENDING — device |
| D02 | Deny media permission | No quota consumed | PENDING — device |
| D03 | Disconnect after file saved but before server receipt | Save pending request ID and reconcile later | PENDING — device |
| D04 | Reopen downloads offline | Local assets show and missing files reconciled | PENDING — device |
| D05 | Download quota boundary near midnight | Correct count by server day | PENDING — device |
| D06 | Premium wallpaper as guest/free user | Full protected asset denied | PENDING — device/security |
| A01 | Guest attempts privileged upload/category modification | Authentication required (401) | PASS — route source check; integration pending |
| A02 | Signed-in non-admin attempts privileged mutation | Forbidden (403) | PASS — route source check; integration pending |
| A03 | Admin performs upload after role lookup | Action succeeds with active session | PENDING — integration |
| A04 | User deletes account | Confirmations, DB transaction and logout work | PENDING — disposable test account |
| A05 | User deletes account with Google Play subscription | User warned Play cancellation is separate | PENDING — device |
| A06 | Open public deletion-request page incognito | Page and email instructions available without login | PENDING — public access |
| N01 | Server loses PostgreSQL | /api/health returns 503, not false 200 | PASS — source check; integration pending |
| N02 | Supabase restored | /api/health returns 200 if DB query succeeds | PASS — source check; integration pending |
| E01 | Wallpaper image/video is invalid or too large | File rejected with useful error | PENDING — integration |
| E02 | Rotate screen / background app during download/purchase | Operation recoverable, no duplicates | PENDING — device |
| E03 | Offline, slow, captive portal and metered network | No unrecoverable spinner or data loss | PENDING — device |
| E04 | Ad fails to load / consent denied | App remains usable without crash | PENDING — device |

## Resolved in review branches (not yet production)
**Backend:** active-session validation on every authorized call; database-sourced admin role; admin-only upload/edit/delete/category mutations; unique JWT identifiers; Google login async validation; removal of Google request-body logging; actual database readiness check; reject mismatched verification on paid Razorpay orders.

**Android:** consistent Expo SecureStore access; handling revoked 401; offline cached-session recovery; synchronous purchase attempt gate; de-duplicated same-token callbacks; removal of sensitive sign-in response logging.

## Open risks requiring separate design
1. **Premium media and public R2 URL:** Media uploads generate publicly routable object URLs (`R2_PUBLIC_URL`). Keeping URLs out of API responses is not sufficient to enforce paid access to known public URLs. Use private objects and short-lived signed access before asserting strict protection of premium originals.
2. **Device-level end-to-end tests and Play Billing sandbox:** require a test build, device/emulator, test Google accounts and Play license testing; do not use live customer accounts.
3. **Real-world refund, billing retry and subscription restoration:** verify state using Play Developer API sandbox, verify idempotency in database, and protect logs from raw purchase tokens.
4. **Database and storage backups:** confirm restore and incident procedures; do not create test records in production without a dedicated test plan.
5. **Live public deletion page accessibility:** verify independently of logged-in Vercel session and ensure Google Play Console links use an anonymous-accessible URL.

## Commands
Run `npm run test:security` in each proposed branch (Node.js 22+ required). Backend test suite and Android test suite are intentionally pure logic; execute app smoke tests on Android and backend integration tests in a staging environment before merging to production.
