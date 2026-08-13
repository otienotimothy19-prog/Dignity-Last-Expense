import { Prisma } from "@prisma/client";
import { nextReferenceCode } from "@/lib/reference";
import { logAudit } from "@/lib/audit";

/**
 * Converts an ACCEPTED quotation into a policy. Everything is copied from
 * the quotation's own already-frozen fields (plan/option/rate version,
 * premium, members) rather than re-derived, so the policy inherits the
 * exact numbers the client accepted — never a live re-price.
 *
 * premiumPaid mirrors the quotation's total premium: no payment-collection
 * flow exists yet (the Payment model is designed but unused), so issuance
 * currently assumes the premium was settled outside the system. A real
 * payment-recording step would set this from actual received amounts and
 * likely gate `status` on it instead of issuing ACTIVE immediately.
 */
export async function issuePolicyFromQuotation(
  tx: Prisma.TransactionClient,
  params: { quotationId: string; issuedById: string }
) {
  const quotation = await tx.quotation.findUniqueOrThrow({
    where: { id: params.quotationId },
    include: {
      members: true,
      rateVersion: true,
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
    },
  });

  if (quotation.status !== "ACCEPTED") {
    throw new Error(`Cannot issue a policy from a quotation in ${quotation.status} status — it must be ACCEPTED first.`);
  }

  const quotationVersion = quotation.versions[0];
  if (!quotationVersion) {
    throw new Error("Quotation has no saved snapshot version to issue a policy from.");
  }

  const referenceCode = await nextReferenceCode(tx, quotation.type === "INDIVIDUAL" ? "DIGN-P" : "DIGN-GP");

  const coverStart = new Date();
  const coverEnd = new Date(coverStart);
  coverEnd.setMonth(coverEnd.getMonth() + quotation.rateVersion.policyDurationMonths);

  const policy = await tx.policy.create({
    data: {
      referenceCode,
      quotationId: quotation.id,
      quotationVersionId: quotationVersion.id,
      type: quotation.type,
      status: "ACTIVE",
      clientId: quotation.clientId,
      groupId: quotation.groupId,
      planId: quotation.planId,
      benefitOptionId: quotation.benefitOptionId,
      rateVersionId: quotation.rateVersionId,
      premiumPaid: quotation.totalPremium,
      coverStart,
      coverEnd,
      issuedById: params.issuedById,
    },
  });

  const memberRows = quotation.members
    .filter((m) => m.eligible)
    .map((m) => ({
      policyId: policy.id,
      relationship: m.relationship,
      fullName: m.fullName,
      idNumber: m.idNumber,
      dob: m.dob,
      benefitAmount: m.benefitAmount,
      eligible: true,
    }));
  if (memberRows.length > 0) {
    await tx.policyMember.createMany({ data: memberRows });
  }

  await tx.quotation.update({ where: { id: quotation.id }, data: { status: "CONVERTED_TO_POLICY" } });

  await logAudit(tx, {
    userId: params.issuedById,
    action: "QUOTATION_CONVERTED",
    entityType: "Quotation",
    entityRef: quotation.referenceCode,
    newValue: { policyReference: referenceCode },
  });
  await logAudit(tx, {
    userId: params.issuedById,
    action: "POLICY_ISSUED",
    entityType: "Policy",
    entityRef: referenceCode,
    newValue: { fromQuotation: quotation.referenceCode, premiumPaid: quotation.totalPremium, coverStart, coverEnd },
  });

  return policy;
}
