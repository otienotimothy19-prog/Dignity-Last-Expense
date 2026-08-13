"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { findValidPasswordResetToken, consumePasswordResetToken } from "@/lib/password-reset";
import { logAudit } from "@/lib/audit";

const MIN_PASSWORD_LENGTH = 8;

export async function resetPasswordAction(
  token: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  const record = await findValidPasswordResetToken(token);
  if (!record) {
    return "This reset link is invalid or has expired. Request a new one.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await logAudit(tx, {
      userId: record.userId,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "User",
      entityRef: record.user.email,
    });
  });

  await consumePasswordResetToken(token);

  redirect("/login?reset=success");
}
