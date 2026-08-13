-- AlterTable
ALTER TABLE "quotation_members" ADD COLUMN     "overridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overridden_by_id" TEXT,
ADD COLUMN     "override_reason" TEXT;
