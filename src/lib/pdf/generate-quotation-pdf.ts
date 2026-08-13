import { promises as fs } from "fs";
import path from "path";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { QuotationDocument, type QuotationPdfCategoryRow, type QuotationPdfMember } from "./QuotationDocument";

const STORAGE_DIR = path.join(process.cwd(), "storage", "documents");
const RELATIONSHIP_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  PARENT_IN_LAW: "Parent-in-law",
};

export async function generateQuotationPdf(quotationId: string, generatedById: string) {
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: quotationId },
    include: {
      client: true,
      group: true,
      plan: true,
      benefitOption: true,
      rateVersion: true,
      members: true,
    },
  });

  const entityName = quotation.client?.fullName ?? quotation.group?.name ?? "";
  const phone = quotation.client?.phone ?? quotation.group?.phone ?? "";
  const email = quotation.client?.email ?? quotation.group?.email ?? null;
  const contactPerson = quotation.group?.contactPerson ?? null;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const qrDataUrl = await QRCode.toDataURL(`${appUrl}/verify/${quotation.referenceCode}`, {
    margin: 1,
    width: 256,
  });

  const namedMembers: QuotationPdfMember[] | undefined =
    quotation.type === "INDIVIDUAL"
      ? quotation.members.map((m) => ({
          relationship: RELATIONSHIP_LABEL[m.relationship] ?? m.relationship,
          fullName: m.fullName,
          dob: m.dob ? formatDateNairobi(m.dob) : null,
          benefitAmount: formatKES(m.benefitAmount.toString()),
          eligible: m.eligible,
        }))
      : undefined;

  const categoryRows: QuotationPdfCategoryRow[] | undefined =
    quotation.type === "GROUP"
      ? [
          { category: "Principal (per contributor)", count: quotation.numContributors, benefitAmount: formatKES(quotation.rateVersion.principalBenefit.toString()) },
          { category: "Spouse", count: quotation.numSpouses, benefitAmount: formatKES(quotation.rateVersion.spouseBenefit.toString()) },
          { category: "Child", count: quotation.numChildren, benefitAmount: formatKES(quotation.rateVersion.childBenefit.toString()) },
          { category: "Parent", count: quotation.numParents, benefitAmount: formatKES(quotation.rateVersion.parentBenefit.toString()) },
          { category: "Parent-in-law", count: quotation.numParentsInLaw, benefitAmount: formatKES(quotation.rateVersion.parentInLawBenefit.toString()) },
        ]
      : undefined;

  const buffer = await renderToBuffer(
    QuotationDocument({
      referenceCode: quotation.referenceCode,
      issueDate: formatDateNairobi(quotation.issueDate),
      validUntil: formatDateNairobi(quotation.validUntil),
      entityName,
      contactPerson,
      phone,
      email,
      planName: quotation.plan.name,
      optionName: quotation.benefitOption.name,
      numContributors: quotation.numContributors,
      namedMembers,
      categoryRows,
      basePremium: formatKES(quotation.basePremium.toString()),
      includedChildren: quotation.rateVersion.maxChildren,
      numAdditionalChildren: quotation.numAdditionalChildren,
      additionalChildRate: formatKES(quotation.rateVersion.additionalChildRate.toString()),
      additionalChildPremium: formatKES(quotation.additionalChildPremium.toString()),
      totalPremium: formatKES(quotation.totalPremium.toString()),
      minGroupSizeMet: quotation.minGroupSizeMet,
      requiresApproval: quotation.requiresApproval,
      minGroupSize: quotation.rateVersion.minGroupSize,
      waitingPeriodDays: quotation.rateVersion.waitingPeriodDays,
      accidentWaitingPeriodDays: quotation.rateVersion.accidentWaitingPeriodDays,
      gracePeriodDays: quotation.rateVersion.gracePeriodDays,
      maxClaimsPerYear: quotation.rateVersion.maxClaimsPerYear,
      maxLifetimeBenefit: formatKES(quotation.rateVersion.maxLifetimeBenefit.toString()),
      claimsLimitNotes: quotation.rateVersion.claimsLimitNotes,
      qrDataUrl,
    })
  );

  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const fileName = `${quotation.referenceCode}.pdf`;
  const filePath = path.join(STORAGE_DIR, fileName);
  await fs.writeFile(filePath, buffer);

  const document = await prisma.document.create({
    data: {
      type: "QUOTATION",
      referenceCode: quotation.referenceCode,
      quotationId: quotation.id,
      filePath: fileName,
      generatedById,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: generatedById,
      action: "DOCUMENT_GENERATED",
      entityType: "Document",
      entityRef: quotation.referenceCode,
    },
  });

  return document;
}
