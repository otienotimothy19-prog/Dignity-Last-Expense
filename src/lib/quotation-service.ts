import { Prisma, RateVersion, RelationshipType } from "@prisma/client";
import { calculatePremium } from "@/lib/premium";
import { nextReferenceCode } from "@/lib/reference";
import { logAudit } from "@/lib/audit";
import { classifyMembers } from "@/lib/eligibility";
import type { MemberInput } from "@/lib/eligibility";
import type { ScheduleRowResult } from "@/lib/group-schedule";

export { classifyMembers } from "@/lib/eligibility";
export type { MemberInput, ClassifiedMember } from "@/lib/eligibility";

export type BeneficiaryInput = {
  fullName: string;
  relationship: string;
  phone: string;
};

export async function createIndividualQuotation(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    benefitOptionId: string;
    rate: RateVersion;
    planId: string;
    members: MemberInput[];
    beneficiaries?: BeneficiaryInput[];
    createdById: string;
    validUntil: Date;
  }
) {
  const classified = classifyMembers(params.rate, params.members);
  const numChildren = params.members.filter((m) => m.relationship === "CHILD").length;
  const numAdditionalChildren = classified.filter((m) => m.chargeableExtra).length;

  const premium = calculatePremium(params.rate, {
    numContributors: 1,
    numAdditionalChildren,
  });

  const referenceCode = await nextReferenceCode(tx, "DIGN-Q");

  const quotation = await tx.quotation.create({
    data: {
      referenceCode,
      type: "INDIVIDUAL",
      status: "GENERATED",
      clientId: params.clientId,
      planId: params.planId,
      benefitOptionId: params.benefitOptionId,
      rateVersionId: params.rate.id,
      numContributors: 1,
      numSpouses: params.members.filter((m) => m.relationship === "SPOUSE").length,
      numChildren,
      numAdditionalChildren,
      numParents: params.members.filter((m) => m.relationship === "PARENT").length,
      numParentsInLaw: params.members.filter((m) => m.relationship === "PARENT_IN_LAW").length,
      basePremium: premium.basePremium,
      additionalChildPremium: premium.additionalChildPremium,
      totalPremium: premium.totalPremium,
      minGroupSizeMet: premium.minGroupSizeMet,
      requiresApproval: premium.requiresApproval,
      rateEffectiveDate: params.rate.effectiveFrom,
      validUntil: params.validUntil,
      createdById: params.createdById,
    },
  });

  const memberRows = classified.map((m) => ({
    quotationId: quotation.id,
    relationship: m.relationship,
    fullName: m.fullName,
    idNumber: m.idNumber ?? null,
    dob: m.dob,
    benefitAmount: m.benefitAmount,
    eligible: m.eligible,
    ineligibilityReason: m.ineligibilityReason,
    overridden: m.overridden,
    overriddenById: m.overridden ? params.createdById : null,
    overrideReason: m.overridden ? m.overrideReason?.trim() || null : null,
  }));
  if (memberRows.length > 0) {
    await tx.quotationMember.createMany({ data: memberRows });
  }

  if (params.beneficiaries && params.beneficiaries.length > 0) {
    await tx.beneficiary.createMany({
      data: params.beneficiaries.map((b) => ({
        quotationId: quotation.id,
        fullName: b.fullName,
        relationship: b.relationship,
        phone: b.phone,
      })),
    });
  }

  await tx.quotationVersion.create({
    data: {
      quotationId: quotation.id,
      versionNumber: 1,
      referenceSuffix: "",
      createdById: params.createdById,
      snapshot: {
        type: "INDIVIDUAL",
        planId: params.planId,
        benefitOptionId: params.benefitOptionId,
        rateVersionId: params.rate.id,
        rate: JSON.parse(JSON.stringify(params.rate)),
        members: memberRows,
        premium,
      } as Prisma.InputJsonValue,
    },
  });

  await logAudit(tx, {
    userId: params.createdById,
    action: "QUOTATION_CREATED",
    entityType: "Quotation",
    entityRef: referenceCode,
    newValue: { totalPremium: premium.totalPremium, memberCount: memberRows.length },
  });

  for (const m of memberRows.filter((r) => r.overridden)) {
    await logAudit(tx, {
      userId: params.createdById,
      action: "MEMBER_ELIGIBILITY_OVERRIDDEN",
      entityType: "QuotationMember",
      entityRef: referenceCode,
      newValue: { fullName: m.fullName, relationship: m.relationship },
      reason: m.overrideReason,
    });
  }

  return quotation;
}

export async function createGroupQuotation(
  tx: Prisma.TransactionClient,
  params: {
    groupId: string;
    benefitOptionId: string;
    rate: RateVersion;
    planId: string;
    numContributors: number;
    numSpouses: number;
    numChildren: number;
    numAdditionalChildren: number;
    numParents: number;
    numParentsInLaw: number;
    /** Full validated member schedule (CSV upload or manual entry), when supplied instead of a summary-only count. */
    schedule?: ScheduleRowResult[];
    beneficiaries?: BeneficiaryInput[];
    createdById: string;
    validUntil: Date;
  }
) {
  const premium = calculatePremium(params.rate, {
    numContributors: params.numContributors,
    numAdditionalChildren: params.numAdditionalChildren,
  });

  const referenceCode = await nextReferenceCode(tx, "DIGN-GQ");

  const quotation = await tx.quotation.create({
    data: {
      referenceCode,
      type: "GROUP",
      status: "GENERATED",
      groupId: params.groupId,
      planId: params.planId,
      benefitOptionId: params.benefitOptionId,
      rateVersionId: params.rate.id,
      numContributors: params.numContributors,
      numSpouses: params.numSpouses,
      numChildren: params.numChildren,
      numAdditionalChildren: params.numAdditionalChildren,
      numParents: params.numParents,
      numParentsInLaw: params.numParentsInLaw,
      basePremium: premium.basePremium,
      additionalChildPremium: premium.additionalChildPremium,
      totalPremium: premium.totalPremium,
      minGroupSizeMet: premium.minGroupSizeMet,
      requiresApproval: premium.requiresApproval,
      rateEffectiveDate: params.rate.effectiveFrom,
      validUntil: params.validUntil,
      createdById: params.createdById,
    },
  });

  let memberRows: {
    quotationId: string;
    relationship: RelationshipType;
    fullName: string;
    idNumber: string | null;
    dob: Date;
    benefitAmount: number;
    eligible: boolean;
    ineligibilityReason: string | null;
    overridden: boolean;
    overriddenById: string | null;
    overrideReason: string | null;
  }[] = [];

  if (params.schedule) {
    memberRows = params.schedule
      .filter((r) => r.status === "valid")
      .map((r) => ({
        quotationId: quotation.id,
        relationship: r.relationship!,
        fullName: r.fullName,
        idNumber: r.idNumber,
        dob: new Date(r.dobRaw),
        benefitAmount: r.benefitAmount,
        eligible: true,
        ineligibilityReason: r.overridden ? r.reason : null,
        overridden: r.overridden,
        overriddenById: r.overridden ? params.createdById : null,
        overrideReason: r.overridden ? (r.reason ?? null) : null,
      }));
    if (memberRows.length > 0) {
      await tx.quotationMember.createMany({ data: memberRows });
    }
  }

  if (params.beneficiaries && params.beneficiaries.length > 0) {
    await tx.beneficiary.createMany({
      data: params.beneficiaries.map((b) => ({
        quotationId: quotation.id,
        fullName: b.fullName,
        relationship: b.relationship,
        phone: b.phone,
      })),
    });
  }

  await tx.quotationVersion.create({
    data: {
      quotationId: quotation.id,
      versionNumber: 1,
      referenceSuffix: "",
      createdById: params.createdById,
      snapshot: {
        type: "GROUP",
        planId: params.planId,
        benefitOptionId: params.benefitOptionId,
        rateVersionId: params.rate.id,
        rate: JSON.parse(JSON.stringify(params.rate)),
        counts: {
          numContributors: params.numContributors,
          numSpouses: params.numSpouses,
          numChildren: params.numChildren,
          numAdditionalChildren: params.numAdditionalChildren,
          numParents: params.numParents,
          numParentsInLaw: params.numParentsInLaw,
        },
        members: params.schedule ? memberRows : undefined,
        premium,
      } as Prisma.InputJsonValue,
    },
  });

  await logAudit(tx, {
    userId: params.createdById,
    action: "QUOTATION_CREATED",
    entityType: "Quotation",
    entityRef: referenceCode,
    newValue: { totalPremium: premium.totalPremium, numContributors: params.numContributors },
  });

  for (const m of memberRows.filter((r) => r.overridden)) {
    await logAudit(tx, {
      userId: params.createdById,
      action: "MEMBER_ELIGIBILITY_OVERRIDDEN",
      entityType: "QuotationMember",
      entityRef: referenceCode,
      newValue: { fullName: m.fullName, relationship: m.relationship },
      reason: m.overrideReason,
    });
  }

  return quotation;
}
