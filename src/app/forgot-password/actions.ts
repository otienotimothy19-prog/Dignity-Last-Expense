"use server";

import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendEmail } from "@/lib/mailer";
import { logAudit } from "@/lib/audit";

const GENERIC_MESSAGE = "If that email is registered, we've sent a password reset link to it.";

/**
 * Always returns the same generic message regardless of whether the email
 * is registered — confirming/denying an account's existence to an anonymous
 * caller is its own information leak.
 */
export async function requestPasswordResetAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return GENERIC_MESSAGE;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive) {
    const rawToken = await createPasswordResetToken(user.id);
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password/${rawToken}`;

    const result = await sendEmail({
      to: user.email,
      subject: "Reset your Dignity Last Expense password",
      html: `
        <p>Hello ${user.fullName},</p>
        <p>Click the link below to set a new password. This link expires in 1 hour and can only be used once.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p>— Imoth Insurance Brokers Ltd</p>
      `,
    });

    await logAudit(prisma, {
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "User",
      entityRef: user.email,
      reason: result.ok ? null : result.error,
    });
  }

  return GENERIC_MESSAGE;
}
