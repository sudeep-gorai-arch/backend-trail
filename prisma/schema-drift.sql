-- AlterTable
ALTER TABLE "downloads" ADD COLUMN     "client_request_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "downloads_client_request_id_key" ON "downloads"("client_request_id");

