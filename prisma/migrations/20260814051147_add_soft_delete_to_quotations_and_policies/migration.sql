-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "deleted_at" TIMESTAMP(3);
