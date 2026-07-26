-- DropForeignKey
ALTER TABLE "downloads" DROP CONSTRAINT "downloads_user_id_fkey";

-- AlterTable
ALTER TABLE "downloads" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
