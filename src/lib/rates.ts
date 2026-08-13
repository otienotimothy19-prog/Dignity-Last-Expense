import { prisma } from "@/lib/prisma";
import type { RateVersion } from "@prisma/client";
import { RATE_FIELD_DEFS, type RateFieldKey } from "@/lib/rate-fields";
import type { SerializedPlan, SerializedRate } from "@/components/rate-management/types";

export async function getActiveRateMatrix(isGroup: boolean) {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isGroup },
    orderBy: { code: "asc" },
    include: {
      product: true,
      benefitOptions: {
        where: { isActive: true },
        orderBy: { optionNumber: "asc" },
        include: {
          rateVersions: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      },
    },
  });
  return plans;
}

export async function getActiveRateVersion(benefitOptionId: string) {
  return prisma.rateVersion.findFirst({
    where: { benefitOptionId, status: "ACTIVE" },
  });
}

export async function getRateVersionHistory(benefitOptionId: string) {
  return prisma.rateVersion.findMany({
    where: { benefitOptionId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllRateVersionHistory() {
  return prisma.rateVersion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      benefitOption: { include: { plan: true } },
    },
    take: 200,
  });
}

export async function getRateVersionById(id: string) {
  return prisma.rateVersion.findUnique({
    where: { id },
    include: { benefitOption: { include: { plan: true } } },
  });
}

function serializeRate(rate: RateVersion): SerializedRate {
  const values: Record<string, number> = {};
  for (const def of RATE_FIELD_DEFS) {
    values[def.key] = Number(rate[def.key as RateFieldKey]);
  }
  return {
    ...(values as Record<RateFieldKey, number>),
    id: rate.id,
    versionLabel: rate.versionLabel,
    status: rate.status,
    effectiveFrom: rate.effectiveFrom.toISOString().slice(0, 10),
    requiresApprovalBelowMin: rate.requiresApprovalBelowMin,
    paymentFrequency: rate.paymentFrequency,
    claimsLimitNotes: rate.claimsLimitNotes ?? "",
  };
}

export async function getSerializedRateMatrix(isGroup: boolean): Promise<SerializedPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isGroup },
    orderBy: { code: "asc" },
    include: {
      benefitOptions: {
        orderBy: { optionNumber: "asc" },
        include: {
          rateVersions: { where: { status: "ACTIVE" }, take: 1 },
        },
      },
    },
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    isGroup: plan.isGroup,
    coversSpouse: plan.coversSpouse,
    coversChildren: plan.coversChildren,
    coversParents: plan.coversParents,
    coversParentsInLaw: plan.coversParentsInLaw,
    options: plan.benefitOptions.map((opt) => ({
      id: opt.id,
      optionNumber: opt.optionNumber,
      name: opt.name,
      isActive: opt.isActive,
      activeRate: opt.rateVersions[0] ? serializeRate(opt.rateVersions[0]) : null,
    })),
  }));
}
