import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { saveDocument } from "@/lib/storage";
import { PolicyDocument, type PolicyPdfCategoryRow, type PolicyPdfMember } from "./PolicyDocument";

const RELATIONSHIP_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  PARENT_IN_LAW: "Parent-in-law",
};

export async function generatePolicyPdf(policyId: string, generatedById: string) {
  const policy = await prisma.policy.findUniqueOrThrow({
    where: { id: policyId },
    include: {
      client: true,
      group: true,
      plan: true,
      benefitOption: true,
      rateVersion: true,
      members: true,
      quotation: true,
    },
  });

  const entityName = policy.client?.fullName ?? policy.group?.name ?? "";
  const phone = policy.client?.phone ?? policy.group?.phone ?? "";
  const email = policy.client?.email ?? policy.group?.email ?? null;
  const contactPerson = policy.group?.contactPerson ?? null;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/verify/${policy.referenceCode}`, {
    margin: 1,
    width: 256,
  });

  const namedMembers: PolicyPdfMember[] | undefined =
    policy.members.length > 0
      ? policy.members.map((m) => ({
          relationship: RELATIONSHIP_LABEL[m.relationship] ?? m.relationship,
          fullName: m.fullName,
          dob: m.dob ? formatDateNairobi(m.dob) : null,
          benefitAmount: formatKES(m.benefitAmount.toString()),
        }))
      : undefined;

  const categoryRows: PolicyPdfCategoryRow[] | undefined =
    policy.members.length === 0
      ? [
          { category: "Principal (per contributor)", count: policy.quotation.numContributors, benefitAmount: formatKES(policy.rateVersion.principalBenefit.toString()) },
          { category: "Spouse", count: policy.quotation.numSpouses, benefitAmount: formatKES(policy.rateVersion.spouseBenefit.toString()) },
          { category: "Child", count: policy.quotation.numChildren, benefitAmount: formatKES(policy.rateVersion.childBenefit.toString()) },
          { category: "Parent", count: policy.quotation.numParents, benefitAmount: formatKES(policy.rateVersion.parentBenefit.toString()) },
          { category: "Parent-in-law", count: policy.quotation.numParentsInLaw, benefitAmount: formatKES(policy.rateVersion.parentInLawBenefit.toString()) },
        ].filter((r) => r.count > 0)
      : undefined;

  const buffer = await renderToBuffer(
    PolicyDocument({
      referenceCode: policy.referenceCode,
      quotationReferenceCode: policy.quotation.referenceCode,
      issuedAt: formatDateNairobi(policy.issuedAt),
      coverStart: formatDateNairobi(policy.coverStart),
      coverEnd: formatDateNairobi(policy.coverEnd),
      entityName,
      contactPerson,
      phone,
      email,
      planName: policy.plan.name,
      optionName: policy.benefitOption.name,
      numContributors: policy.quotation.numContributors,
      namedMembers,
      categoryRows,
      premiumPaid: formatKES(policy.premiumPaid.toString()),
      waitingPeriodDays: policy.rateVersion.waitingPeriodDays,
      accidentWaitingPeriodDays: policy.rateVersion.accidentWaitingPeriodDays,
      gracePeriodDays: policy.rateVersion.gracePeriodDays,
      maxClaimsPerYear: policy.rateVersion.maxClaimsPerYear,
      maxLifetimeBenefit: formatKES(policy.rateVersion.maxLifetimeBenefit.toString()),
      claimsLimitNotes: policy.rateVersion.claimsLimitNotes,
      qrDataUrl,
    })
  );

  const fileName = `${policy.referenceCode}.pdf`;
  await saveDocument(fileName, buffer);

  const document = await prisma.document.create({
    data: {
      type: "POLICY",
      referenceCode: policy.referenceCode,
      policyId: policy.id,
      filePath: fileName,
      generatedById,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: generatedById,
      action: "DOCUMENT_GENERATED",
      entityType: "Document",
      entityRef: policy.referenceCode,
    },
  });

  return document;
}
