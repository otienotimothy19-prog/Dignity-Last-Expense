"use server";

import { promises as fs } from "fs";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateQuotationPdf } from "@/lib/pdf/generate-quotation-pdf";
import { logAudit } from "@/lib/audit";
import { hasPermission, type Permission } from "@/lib/permissions";
import { createIndividualQuotation, createGroupQuotation } from "@/lib/quotation-service";
import { issuePolicyFromQuotation } from "@/lib/policy-service";
import { generatePolicyPdf } from "@/lib/pdf/generate-policy-pdf";
import { sendEmail } from "@/lib/mailer";
import type { QuotationStatus, SendChannel } from "@prisma/client";

export async function generatePdfAction(quotationId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.generate")) {
    throw new Error("Not authorized to generate quotation documents.");
  }

  await generateQuotationPdf(quotationId, session.user.id);
  revalidatePath(`/quotations/${quotationId}`);
}

const ALLOWED_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["GENERATED"],
  // ACCEPTED doesn't require SENT to have happened first — a client can
  // accept based on a downloaded/printed/WhatsApped PDF without the
  // system's own outbound email having succeeded (or been sent at all).
  GENERATED: ["SENT", "ACCEPTED", "DECLINED", "EXPIRED"],
  SENT: ["ACCEPTED", "DECLINED", "EXPIRED"],
  ACCEPTED: [],
  DECLINED: [],
  EXPIRED: [],
  CONVERTED_TO_POLICY: [],
};

const STATUS_PERMISSION: Partial<Record<QuotationStatus, Permission>> = {
  GENERATED: "quotations.generate",
  SENT: "quotations.send",
  ACCEPTED: "quotations.accept",
  DECLINED: "quotations.decline",
  EXPIRED: "quotations.decline",
};

export async function transitionStatusAction(quotationId: string, nextStatus: QuotationStatus) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");

  const required = STATUS_PERMISSION[nextStatus];
  if (required && !hasPermission(session.user.role, required)) {
    throw new Error(`Not authorized to move this quotation to ${nextStatus}.`);
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  const allowed = ALLOWED_TRANSITIONS[quotation.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot move quotation from ${quotation.status} to ${nextStatus}.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: quotationId }, data: { status: nextStatus } });
    await logAudit(tx, {
      userId: session.user.id,
      action: `QUOTATION_${nextStatus}`,
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      oldValue: { status: quotation.status },
      newValue: { status: nextStatus },
    });
  });

  revalidatePath(`/quotations/${quotationId}`);
}

/**
 * Sends the most recently generated PDF by email and records the attempt in
 * EmailLog regardless of outcome — success or failure is never silently
 * dropped. No email provider is configured in this environment (see
 * src/lib/mailer.ts), so this will log a FAILED attempt and leave the
 * quotation's status unchanged until real SMTP/provider credentials are set.
 */
export async function sendQuotationEmailAction(
  quotationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.send")) {
    return "Not authorized to send quotations.";
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { client: true, group: true, documents: { orderBy: { generatedAt: "desc" }, take: 1 } },
  });

  const allowed = ALLOWED_TRANSITIONS[quotation.status] ?? [];
  if (!allowed.includes("SENT")) {
    return `Cannot send a quotation in ${quotation.status} status.`;
  }

  const recipient = String(formData.get("recipientEmail") ?? "").trim() || quotation.client?.email || quotation.group?.email || "";
  if (!recipient) {
    return "No recipient email address — add one to the client/group record or enter one below.";
  }

  const doc = quotation.documents[0];
  if (!doc) {
    return "Generate the PDF before sending this quotation.";
  }
  const fileBuffer = await fs.readFile(path.join(process.cwd(), "storage", "documents", doc.filePath));

  const subject = `Your Dignity Last Expense Quotation — ${quotation.referenceCode}`;
  const result = await sendEmail({
    to: recipient,
    subject,
    html: `<p>Please find attached your Dignity Last Expense quotation, reference ${quotation.referenceCode}.</p>`,
    attachment: { filename: `${quotation.referenceCode}.pdf`, content: fileBuffer, contentType: "application/pdf" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.create({
      data: {
        toAddress: recipient,
        subject,
        template: "quotation-send",
        entityRef: quotation.referenceCode,
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? null : result.error,
        sentAt: result.ok ? new Date() : null,
        channel: "EMAIL",
        sentById: session.user.id,
      },
    });

    if (result.ok) {
      await tx.quotation.update({ where: { id: quotationId }, data: { status: "SENT" } });
    }

    await logAudit(tx, {
      userId: session.user.id,
      action: "QUOTATION_SENT",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      newValue: { recipient, channel: "EMAIL", success: result.ok },
      reason: result.ok ? null : result.error,
    });
  });

  revalidatePath(`/quotations/${quotationId}`);

  if (!result.ok) {
    return `Email was not sent: ${result.error}`;
  }
}

/**
 * Records a quick-share attempt (mailto: / wa.me deep link, opened directly
 * by the browser — see SharePanel.tsx) in the same EmailLog table as the
 * automated send path, with status QUEUED: the system handed the message
 * off to the agent's own email/WhatsApp client, but has no way to confirm
 * whether they actually completed and sent it, so it's never marked SENT.
 */
export async function logShareAttemptAction(quotationId: string, channel: SendChannel, recipient: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.send")) {
    throw new Error("Not authorized to share quotations.");
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });

  await prisma.$transaction(async (tx) => {
    await tx.emailLog.create({
      data: {
        toAddress: recipient || "(selected in app)",
        subject: `Dignity Last Expense Quotation — ${quotation.referenceCode}`,
        template: "quotation-share",
        entityRef: quotation.referenceCode,
        status: "QUEUED",
        channel,
        sentById: session.user.id,
      },
    });
    await logAudit(tx, {
      userId: session.user.id,
      action: "QUOTATION_SHARED",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      newValue: { channel, recipient },
    });
  });

  revalidatePath(`/quotations/${quotationId}`);
}

/**
 * Creates a fresh quotation for the same client/group and cover, re-priced
 * against whatever rate is ACTIVE right now (never the original's frozen
 * snapshot — duplicating is "start a new quote like this one", not "clone
 * these exact numbers"). Individual quotations carry their named members
 * forward for re-validation against the current rate; group quotations
 * carry forward the membership counts recorded on the original (counts are
 * always available regardless of whether it was summary- or schedule-mode).
 */
export async function duplicateQuotationAction(quotationId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.create")) {
    throw new Error("Not authorized to duplicate quotations.");
  }

  const original = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: {
      members: true,
      benefitOption: { include: { rateVersions: { where: { status: "ACTIVE" }, take: 1 } } },
    },
  });

  const rate = original.benefitOption.rateVersions[0];
  if (!rate) {
    throw new Error("Cannot duplicate: the plan/option for this quotation no longer has an active rate configured.");
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const duplicate = await prisma.$transaction(async (tx) => {
    const created =
      original.type === "INDIVIDUAL"
        ? await createIndividualQuotation(tx, {
            clientId: original.clientId!,
            benefitOptionId: original.benefitOptionId,
            rate,
            planId: original.planId,
            members: original.members.map((m) => ({
              relationship: m.relationship,
              fullName: m.fullName,
              idNumber: m.idNumber,
              dob: m.dob!,
            })),
            createdById: session.user.id,
            validUntil,
          })
        : await createGroupQuotation(tx, {
            groupId: original.groupId!,
            benefitOptionId: original.benefitOptionId,
            rate,
            planId: original.planId,
            numContributors: original.numContributors,
            numSpouses: original.numSpouses,
            numChildren: original.numChildren,
            numAdditionalChildren: original.numAdditionalChildren,
            numParents: original.numParents,
            numParentsInLaw: original.numParentsInLaw,
            createdById: session.user.id,
            validUntil,
          });

    await logAudit(tx, {
      userId: session.user.id,
      action: "QUOTATION_DUPLICATED",
      entityType: "Quotation",
      entityRef: created.referenceCode,
      oldValue: { duplicatedFrom: original.referenceCode },
    });

    return created;
  });

  redirect(`/quotations/${duplicate.id}`);
}

export async function convertToPolicyAction(quotationId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.convert")) {
    throw new Error("Not authorized to convert quotations to policies.");
  }

  const policy = await prisma.$transaction((tx) =>
    issuePolicyFromQuotation(tx, { quotationId, issuedById: session.user.id })
  );

  // A policy is the terminal document, not a draft — generate its
  // certificate immediately so it's downloadable the moment it's issued,
  // rather than requiring a separate manual "Generate PDF" click.
  await generatePolicyPdf(policy.id, session.user.id);

  redirect(`/policies/${policy.id}`);
}
