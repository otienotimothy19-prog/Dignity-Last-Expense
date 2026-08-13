-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "covers_children" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "covers_parents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "covers_parents_in_law" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "covers_spouse" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "rate_versions" ADD COLUMN     "claims_settlement_hours" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "payment_frequency" TEXT NOT NULL DEFAULT 'ANNUAL',
ADD COLUMN     "policy_duration_months" INTEGER NOT NULL DEFAULT 12;
