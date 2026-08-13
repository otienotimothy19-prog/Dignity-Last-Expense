import { prisma } from "@/lib/prisma";

export async function getSelectableBenefitOptions(isGroup: boolean) {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isGroup },
    orderBy: { code: "asc" },
    include: {
      benefitOptions: {
        where: { isActive: true },
        orderBy: { optionNumber: "asc" },
        include: { rateVersions: { where: { status: "ACTIVE" }, take: 1 } },
      },
    },
  });

  return plans.flatMap((plan) =>
    plan.benefitOptions
      .filter((opt) => opt.rateVersions.length > 0)
      .map((opt) => ({
        benefitOptionId: opt.id,
        planId: plan.id,
        planName: plan.name,
        optionName: opt.name,
        rate: opt.rateVersions[0],
      }))
  );
}

export type TierOption = {
  planId: string;
  planName: string;
  coversSpouse: boolean;
  coversChildren: boolean;
  coversParents: boolean;
  coversParentsInLaw: boolean;
  grades: {
    benefitOptionId: string;
    gradeName: string;
    principalBenefit: string;
    spouseBenefit: string;
    childBenefit: string;
    parentBenefit: string;
    parentInLawBenefit: string;
    annualRate: string;
    additionalChildRate: string;
    maxChildren: number;
    maxParents: number;
    maxParentsInLaw: number;
    minAge: number;
    maxAge: number;
    minChildAgeMonths: number;
    maxChildAgeYears: number;
    minParentAge: number;
    maxParentAge: number;
  }[];
};

export async function getIndividualFamilyTiers(): Promise<TierOption[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isGroup: false },
    orderBy: { code: "asc" },
    include: {
      benefitOptions: {
        where: { isActive: true },
        orderBy: { optionNumber: "asc" },
        include: { rateVersions: { where: { status: "ACTIVE" }, take: 1 } },
      },
    },
  });

  return plans.map((plan) => ({
    planId: plan.id,
    planName: plan.name,
    coversSpouse: plan.coversSpouse,
    coversChildren: plan.coversChildren,
    coversParents: plan.coversParents,
    coversParentsInLaw: plan.coversParentsInLaw,
    grades: plan.benefitOptions
      .filter((opt) => opt.rateVersions.length > 0)
      .map((opt) => {
        const rate = opt.rateVersions[0];
        return {
          benefitOptionId: opt.id,
          gradeName: opt.name,
          principalBenefit: rate.principalBenefit.toString(),
          spouseBenefit: rate.spouseBenefit.toString(),
          childBenefit: rate.childBenefit.toString(),
          parentBenefit: rate.parentBenefit.toString(),
          parentInLawBenefit: rate.parentInLawBenefit.toString(),
          annualRate: rate.annualRate.toString(),
          additionalChildRate: rate.additionalChildRate.toString(),
          maxChildren: rate.maxChildren,
          maxParents: rate.maxParents,
          maxParentsInLaw: rate.maxParentsInLaw,
          minAge: rate.minAge,
          maxAge: rate.maxAge,
          minChildAgeMonths: rate.minChildAgeMonths,
          maxChildAgeYears: rate.maxChildAgeYears,
          minParentAge: rate.minParentAge,
          maxParentAge: rate.maxParentAge,
        };
      }),
  }));
}
