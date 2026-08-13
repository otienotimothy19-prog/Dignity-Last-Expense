import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a random reset token, stores only its hash, and returns the raw
 * token to embed in the emailed link. Any previous unused tokens for this
 * user are invalidated first so only the most recently requested link works.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  return rawToken;
}

export async function findValidPasswordResetToken(rawToken: string) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;
  return record;
}

export async function consumePasswordResetToken(rawToken: string) {
  await prisma.passwordResetToken.update({
    where: { tokenHash: hashToken(rawToken) },
    data: { usedAt: new Date() },
  });
}
