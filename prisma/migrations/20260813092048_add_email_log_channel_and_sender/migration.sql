-- CreateEnum
CREATE TYPE "SendChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "email_logs" ADD COLUMN     "channel" "SendChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "sent_by_id" TEXT;
