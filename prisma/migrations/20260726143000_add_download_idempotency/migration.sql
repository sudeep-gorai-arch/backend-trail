-- Safe, repeatable idempotency migration.
-- This migration does not delete or modify existing download rows.

ALTER TABLE "downloads"
ADD COLUMN IF NOT EXISTS "client_request_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "downloads_client_request_id_key"
ON "downloads"("client_request_id");