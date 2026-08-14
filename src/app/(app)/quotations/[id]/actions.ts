"use server";

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
import { readDocument } from "@/lib/storage";
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
  const fileBuffer = await readDocument(doc.filePath);

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

/**
 * Records a premium payment against a quotation — the transaction code
 * field is the existing (previously unused) Payment.mpesaCode column.
 * Recording happens on the quotation, before conversion, per this app's
 * flow; policies don't get their own payment-recording entry point.
 * outstandingBalance is computed against ALL payments recorded so far
 * (not just this one), so partial payments accumulate correctly.
 */
/**
 * Adds a beneficiary directly on the quotation — needed as a fallback since
 * the wizard's beneficiary step is optional at creation time, but at least
 * one beneficiary is REQUIRED before a quotation can convert to a policy
 * (see issuePolicyFromQuotation). Individual/Nuclear/Extended Family
 * quotations are capped at one beneficiary, matching the wizard's rule;
 * Group quotations aren't capped here since they can have one per family.
 * Reuses quotations.edit — same "update this record's details" capability.
 */
export async function addQuotationBeneficiaryAction(quotationId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.edit")) {
    throw new Error("Not authorized to edit quotation beneficiaries.");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const relationship = String(formData.get("relationship") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!fullName || !relationship || !phone) {
    throw new Error("Full name, relationship, and phone are all required to add a beneficiary.");
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { beneficiaries: true },
  });
  if (quotation.status === "CONVERTED_TO_POLICY") {
    throw new Error("This quotation has already been converted to a policy — edit beneficiaries there instead.");
  }
  if (quotation.type === "INDIVIDUAL" && quotation.beneficiaries.length >= 1) {
    throw new Error("Individual/Family quotations take only one beneficiary — remove the existing one first.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.beneficiary.create({ data: { quotationId, fullName, relationship, phone } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "BENEFICIARY_ADDED",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      newValue: { fullName, relationship, phone },
    });
  });

  revalidatePath(`/quotations/${quotationId}`);
}

export async function removeQuotationBeneficiaryAction(quotationId: string, beneficiaryId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.edit")) {
    throw new Error("Not authorized to edit quotation beneficiaries.");
  }

  const [quotation, beneficiary] = await Promise.all([
    prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } }),
    prisma.beneficiary.findUniqueOrThrow({ where: { id: beneficiaryId } }),
  ]);
  if (quotation.status === "CONVERTED_TO_POLICY") {
    throw new Error("This quotation has already been converted to a policy — edit beneficiaries there instead.");
  }
  if (beneficiary.quotationId !== quotationId) {
    throw new Error("Beneficiary does not belong to this quotation.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.beneficiary.delete({ where: { id: beneficiaryId } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "BENEFICIARY_REMOVED",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      oldValue: { fullName: beneficiary.fullName, relationship: beneficiary.relationship, phone: beneficiary.phone },
    });
  });

  revalidatePath(`/quotations/${quotationId}`);
}

export async function recordQuotationPaymentAction(
  quotationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.record_payment")) {
    return "Not authorized to record payments.";
  }

  const amountPaid = Number(formData.get("amountPaid"));
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return "Enter a valid amount paid.";
  }
  const transactionCode = String(formData.get("transactionCode") ?? "").trim();
  if (!transactionCode) {
    return "Enter the M-Pesa transaction code.";
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: { payments: true },
  });
  if (quotation.status === "CONVERTED_TO_POLICY") {
    return "This quotation has already been converted to a policy — record further payments there.";
  }

  const alreadyPaid = quotation.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const totalPremium = Number(quotation.totalPremium);
  const outstandingBalance = Math.max(0, totalPremium - (alreadyPaid + amountPaid));

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        quotationId: quotation.id,
        amountInvoiced: totalPremium,
        amountPaid,
        method: "MPESA",
        mpesaCode: transactionCode,
        paymentDate: new Date(),
        outstandingBalance,
        recordedById: session.user.id,
      },
    });
    await logAudit(tx, {
      userId: session.user.id,
      action: "PAYMENT_RECORDED",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      newValue: { amountPaid, transactionCode, outstandingBalance },
    });
  });

  revalidatePath(`/quotations/${quotationId}`);
}

// Never DRAFT/GENERATED/DECLINED/EXPIRED's more-committed neighbors:
// ACCEPTED and CONVERTED_TO_POLICY represent real business events (a client
// said yes, or a policy now exists referencing this exact quotation) and
// must never be removable from lists, regardless of permission.
const DELETABLE_QUOTATION_STATUSES: QuotationStatus[] = ["DRAFT", "GENERATED", "DECLINED", "EXPIRED"];

/**
 * Soft-deletes a quotation — sets deletedAt so it drops out of lists,
 * search, and QR verification, but the row and everything referencing it
 * (audit log, versions, members, documents, email log) stays intact. Never
 * available for ACCEPTED or CONVERTED_TO_POLICY quotations.
 */
export async function deleteQuotationAction(quotationId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.delete")) {
    throw new Error("Not authorized to delete quotations.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("A reason is required to delete a quotation.");
  }

  const quotation = await prisma.quotation.findUniqueOrThrow({ where: { id: quotationId } });
  if (!DELETABLE_QUOTATION_STATUSES.includes(quotation.status)) {
    throw new Error(`Cannot delete a quotation in ${quotation.status} status.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: quotationId }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "QUOTATION_DELETED",
      entityType: "Quotation",
      entityRef: quotation.referenceCode,
      reason,
    });
  });

  redirect("/quotations");
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
