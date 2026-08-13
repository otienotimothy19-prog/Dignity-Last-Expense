/*
  Warnings:

  - You are about to drop the column `is_active` on the `rate_versions` table. All the data in the column will be lost.
  - Added the required column `rate_effective_date` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RateVersionStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'INACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "rate_effective_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "rate_versions" DROP COLUMN "is_active",
ADD COLUMN     "accident_waiting_period_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activated_at" TIMESTAMP(3),
ADD COLUMN     "activated_by_id" TEXT,
ADD COLUMN     "cloned_from_id" TEXT,
ADD COLUMN     "grace_period_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "max_child_age_years" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "max_claims_per_year" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "max_lifetime_benefit" DECIMAL(14,2) NOT NULL DEFAULT 1000000,
ADD COLUMN     "max_parent_age" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN     "max_parents" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "max_parents_in_law" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "min_child_age_months" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "min_parent_age" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "status" "RateVersionStatus" NOT NULL DEFAULT 'DRAFT';
