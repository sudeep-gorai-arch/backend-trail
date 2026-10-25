# FlexiWalls premium media and quota hardening — rollout plan

**Status: NOT DEPLOYED.** The API-abuse PR intentionally preserves download compatibility while this migration is implemented and tested separately.

## Why a coordinated migration is required

- R2 originals/videos were uploaded using objects accessible through `R2_PUBLIC_URL`. Suppressing these URLs in JSON alone cannot revoke already-public links.
- The Android download workflow calls `/downloads/preflight`, downloads the bytes, then calls `/downloads/commit`. A modified client can download without committing and therefore avoid the daily counter.
- Changes must preserve legitimate device-gallery saves, guest usage, idempotent retry, and download limits without introducing double-counting.

## Proposed secure architecture

1. Store Premium originals and Premium videos in a **private** R2 bucket or private key namespace; keep appropriately downsized previews/thumbnails public if the product needs browsing previews.
2. Add a server-side `POST /downloads/reserve` request accepting `wallpaperId`, stable owner identity, and idempotent `clientRequestId`. In one serializable transaction, validate entitlement, allocate daily quota, and persist a short-lived reservation. Use uniqueness per request ID and owner to stop double-counts. A second request with the same ID returns the same reservation.
3. Issue a very short-lived signed GET URL only for private full-resolution content, bound to the reserved wallpaper and authorized request. Never sign arbitrary object keys supplied by clients.
4. Have Android request device media permission before reserve; on successful save, call `/downloads/confirm`. On failure, call `/downloads/release` or allow the server to expire/release unused reservations. Handle connection loss with persisted local request ID and reconciliation. Ensure release/confirm are idempotent.
5. Audit legacy routes; retire public full-resolution URLs from DTOs and deny legacy unauthenticated full-resolution downloads once the **new** internal-testing APK is installed.
6. For every already-published Premium object, migrate the bytes to private R2 storage, update DB paths transactionally, then disable public access to the old object. Verify the old public URL is no longer reachable even if a user has saved it.
7. Load-test concurrent reservation calls (same and different request IDs), expiry/midnight transitions, guest/account switching, retries after offline saves, and simultaneous Premium expiry.

## Do not deploy before these acceptance tests pass

- Existing Free, Guest and Pro wallpaper browsing and previews remain functional.
- Guest/Free daily quota blocks the next download even when the client intentionally skips confirmation.
- Restored purchases access Premium only while Google Play confirms entitlement.
- No full-resolution Premium object is directly accessible through a known public R2 URL.
- Download interrupted after reservation does not permanently steal a quota slot.
- Parallel reservations cannot overspend the daily quota, and retries cannot double-charge it.
- All existing Play Internal Testing devices use a client compatible with the new access API.

## Security note

An IP-only throttle or a validated UUID alone cannot prevent guest quota reset by rotating identities. Stronger guest/device-abuse defenses should be added after privacy and policy review, without collecting unnecessary user identifiers.
