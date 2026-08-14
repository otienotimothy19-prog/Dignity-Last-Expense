"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePolicyPdf } from "@/lib/pdf/generate-policy-pdf";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { sendEmail } from "@/lib/mailer";
import { readDocument } from "@/lib/storage";
import type { SendChannel } from "@prisma/client";

// Policy documents reuse the quotations.generate permission — same
// document-generation capability, same set of roles, no dedicated
// policies.* permission dimension exists yet.
export async function generatePolicyPdfAction(policyId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.generate")) {
    throw new Error("Not authorized to generate policy documents.");
  }

  await generatePolicyPdf(policyId, session.user.id);
  revalidatePath(`/policies/${policyId}`);
}

// Reuses quotations.edit — same "update this record's details" capability,
// no dedicated policies.* permission dimension exists yet.
export async function addBeneficiaryAction(policyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.edit")) {
    throw new Error("Not authorized to edit policy beneficiaries.");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!fullName || !relationship || !phone) {
    throw new Error("Full name, relationship, and phone are all required to add a beneficiary.");
  }

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });

  await prisma.$transaction(async (tx) => {
    await tx.beneficiary.create({ data: { policyId, fullName, relationship, phone } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "BENEFICIARY_ADDED",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      newValue: { fullName, relationship, phone },
    });
  });

  revalidatePath(`/policies/${policyId}`);
}

export async function removeBeneficiaryAction(policyId: string, beneficiaryId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.edit")) {
    throw new Error("Not authorized to edit policy beneficiaries.");
  }

  const [policy, beneficiary] = await Promise.all([
    prisma.policy.findUniqueOrThrow({ where: { id: policyId } }),
    prisma.beneficiary.findUniqueOrThrow({ where: { id: beneficiaryId } }),
  ]);
  if (beneficiary.policyId !== policyId) {
    throw new Error("Beneficiary does not belong to this policy.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.beneficiary.delete({ where: { id: beneficiaryId } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "BENEFICIARY_REMOVED",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      oldValue: { fullName: beneficiary.fullName, relationship: beneficiary.relationship, phone: beneficiary.phone },
    });
  });

  revalidatePath(`/policies/${policyId}`);
}

/**
 * Sends the most recently generated policy certificate by email and records
 * the attempt in EmailLog regardless of outcome. Reuses quotations.send —
 * same "hand this document to the client" capability as quotation sending,
 * same trust level, no dedicated policies.* permission dimension exists yet
 * (see generatePolicyPdfAction above).
 */
export async function sendPolicyEmailAction(
  policyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.send")) {
    return "Not authorized to send policies.";
  }

  const policy = await prisma.policy.findUniqueOrThrow({
    where: { id: policyId },
    include: { client: true, group: true, documents: { orderBy: { generatedAt: "desc" }, take: 1 } },
  });

  const recipient = String(formData.get("recipientEmail") ?? "").trim() || policy.client?.email || policy.group?.email || "";
  if (!recipient) {
    return "No recipient email address — add one to the client/group record or enter one below.";
  }

  const doc = policy.documents[0];
  if (!doc) {
    return "Generate the PDF before sending this policy.";
  }
  const fileBuffer = await readDocument(doc.filePath);

  const subject = `Your Dignity Last Expense Policy Certificate — ${policy.referenceCode}`;
  const result = await sendEmail({
    to: recipient,
    subject,
    html: `<p>Please find attached your Dignity Last Expense policy certificate, reference ${policy.referenceCode}.</p>`,
    attachment: { filename: `${policy.referenceCode}.pdf`, content: fileBuffer, contentType: "application/pdf" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.create({
      data: {
        toAddress: recipient,
        subject,
        template: "policy-send",
        entityRef: policy.referenceCode,
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? null : result.error,
        sentAt: result.ok ? new Date() : null,
        channel: "EMAIL",
        sentById: session.user.id,
      },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "POLICY_SENT",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      newValue: { recipient, channel: "EMAIL", success: result.ok },
      reason: result.ok ? null : result.error,
    });
  });

  revalidatePath(`/policies/${policyId}`);

  if (!result.ok) {
    return `Email was not sent: ${result.error}`;
  }
}

/**
 * Records a quick-share attempt (wa.me deep link, opened directly by the
 * browser — see WhatsAppShare.tsx) in the same EmailLog table as the
 * automated send path, with status QUEUED — the system handed the message
 * off to the agent's own WhatsApp client but has no way to confirm whether
 * they actually completed and sent it.
 */
export async function logPolicyShareAttemptAction(policyId: string, channel: SendChannel, recipient: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.send")) {
    throw new Error("Not authorized to share policies.");
  }

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.create({
      data: {
        toAddress: recipient || "(selected in app)",
        subject: `Dignity Last Expense Policy Certificate — ${policy.referenceCode}`,
        template: "policy-share",
        entityRef: policy.referenceCode,
        status: "QUEUED",
        channel,
        sentById: session.user.id,
      },
    });
    await logAudit(tx, {
      userId: session.user.id,
      action: "POLICY_SHARED",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      newValue: { channel, recipient },
    });
  });

  revalidatePath(`/policies/${policyId}`);
}

/**
 * Soft-deletes a policy — sets deletedAt so it drops out of lists, search,
 * and QR verification, but the row and everything referencing it (members,
 * documents, payments, the linked quotation) stays intact. Also reuses
 * quotations.delete (see generatePolicyPdfAction above for why there's no
 * separate policies.* permission dimension).
 */
export async function deletePolicyAction(policyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.delete")) {
    throw new Error("Not authorized to delete policies.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("A reason is required to delete a policy.");
  }

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });

  await prisma.$transaction(async (tx) => {
    await tx.policy.update({ where: { id: policyId }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "POLICY_DELETED",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      reason,
    });
  });

  redirect("/policies");
}
