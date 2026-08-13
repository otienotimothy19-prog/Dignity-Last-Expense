import { PrismaClient, PlanCode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_NAMES, ROLE_LABELS } from "../src/lib/roles";

const prisma = new PrismaClient();

const EFFECTIVE_FROM = new Date("2026-01-01T00:00:00Z");

// Shared Dignity product rules from the brochure — every individual/family rate
// version starts from these defaults but they remain fully editable per version.
const INDIVIDUAL_FAMILY_RULES = {
  minAge: 18,
  maxAge: 70,
  minChildAgeMonths: 3,
  maxChildAgeYears: 18,
  minParentAge: 30,
  maxParentAge: 80,
  waitingPeriodDays: 90, // 3 months, natural death
  accidentWaitingPeriodDays: 0, // immediate
  gracePeriodDays: 7,
  maxClaimsPerYear: 3,
  maxLifetimeBenefit: 1_000_000,
  requiresApprovalBelowMin: false, // minGroupSize is always 1 for individual/family
};

type Grade = {
  grade: "Bronze" | "Silver" | "Gold";
  rank: number;
  principal: number;
  spouse: number;
  child: number;
  parent: number;
  parentInLaw: number;
  annualPremium: number;
  additionalChildRate: number;
  maxChildren: number;
  maxParents: number;
  maxParentsInLaw: number;
};

const INDIVIDUAL_ONLY: Grade[] = [
  { grade: "Bronze", rank: 1, principal: 50_000, spouse: 0, child: 0, parent: 0, parentInLaw: 0, annualPremium: 744, additionalChildRate: 0, maxChildren: 0, maxParents: 0, maxParentsInLaw: 0 },
  { grade: "Silver", rank: 2, principal: 100_000, spouse: 0, child: 0, parent: 0, parentInLaw: 0, annualPremium: 1_488, additionalChildRate: 0, maxChildren: 0, maxParents: 0, maxParentsInLaw: 0 },
  { grade: "Gold", rank: 3, principal: 200_000, spouse: 0, child: 0, parent: 0, parentInLaw: 0, annualPremium: 2_976, additionalChildRate: 0, maxChildren: 0, maxParents: 0, maxParentsInLaw: 0 },
];

const NUCLEAR_FAMILY: Grade[] = [
  { grade: "Bronze", rank: 1, principal: 50_000, spouse: 50_000, child: 25_000, parent: 0, parentInLaw: 0, annualPremium: 996, additionalChildRate: 0, maxChildren: 4, maxParents: 0, maxParentsInLaw: 0 },
  { grade: "Silver", rank: 2, principal: 100_000, spouse: 100_000, child: 50_000, parent: 0, parentInLaw: 0, annualPremium: 1_980, additionalChildRate: 0, maxChildren: 4, maxParents: 0, maxParentsInLaw: 0 },
  { grade: "Gold", rank: 3, principal: 200_000, spouse: 200_000, child: 100_000, parent: 0, parentInLaw: 0, annualPremium: 3_960, additionalChildRate: 0, maxChildren: 4, maxParents: 0, maxParentsInLaw: 0 },
];

const EXTENDED_FAMILY: Grade[] = [
  { grade: "Bronze", rank: 1, principal: 50_000, spouse: 50_000, child: 25_000, parent: 25_000, parentInLaw: 25_000, annualPremium: 3_522, additionalChildRate: 150, maxChildren: 4, maxParents: 2, maxParentsInLaw: 2 },
  { grade: "Silver", rank: 2, principal: 100_000, spouse: 100_000, child: 50_000, parent: 50_000, parentInLaw: 50_000, annualPremium: 6_570, additionalChildRate: 300, maxChildren: 4, maxParents: 2, maxParentsInLaw: 2 },
  { grade: "Gold", rank: 3, principal: 200_000, spouse: 200_000, child: 100_000, parent: 75_000, parentInLaw: 75_000, annualPremium: 13_140, additionalChildRate: 450, maxChildren: 4, maxParents: 2, maxParentsInLaw: 2 },
];

const INDIVIDUAL_FAMILY_PLANS: {
  code: PlanCode;
  name: string;
  grades: Grade[];
  coversSpouse: boolean;
  coversChildren: boolean;
  coversParents: boolean;
  coversParentsInLaw: boolean;
}[] = [
  { code: "INDIVIDUAL", name: "Individual Only", grades: INDIVIDUAL_ONLY, coversSpouse: false, coversChildren: false, coversParents: false, coversParentsInLaw: false },
  { code: "NUCLEAR_FAMILY", name: "Nuclear Family", grades: NUCLEAR_FAMILY, coversSpouse: true, coversChildren: true, coversParents: false, coversParentsInLaw: false },
  { code: "EXTENDED_FAMILY", name: "Extended Family", grades: EXTENDED_FAMILY, coversSpouse: true, coversChildren: true, coversParents: true, coversParentsInLaw: true },
];

// Group rate tiers are a separate rate set from individual/family (kept as
// numbered options 1-6, unaffected by the brochure update above).
type GroupTier = {
  optionNumber: number;
  name: string;
  principal: number;
  annualRate: number;
  additionalChildRate: number;
};

const GROUP_TIERS: GroupTier[] = [
  { optionNumber: 1, name: "Option 1", principal: 50_000, annualRate: 1_500, additionalChildRate: 300 },
  { optionNumber: 2, name: "Option 2", principal: 75_000, annualRate: 2_200, additionalChildRate: 400 },
  { optionNumber: 3, name: "Option 3", principal: 100_000, annualRate: 3_000, additionalChildRate: 500 },
  { optionNumber: 4, name: "Option 4", principal: 150_000, annualRate: 4_200, additionalChildRate: 650 },
  { optionNumber: 5, name: "Option 5", principal: 200_000, annualRate: 5_500, additionalChildRate: 800 },
  { optionNumber: 6, name: "Option 6", principal: 300_000, annualRate: 8_000, additionalChildRate: 1_000 },
];

const GROUP_PLANS: {
  code: PlanCode;
  name: string;
  minGroupSize: number;
  coversSpouse: boolean;
  coversChildren: boolean;
  coversParents: boolean;
  coversParentsInLaw: boolean;
}[] = [
  { code: "GROUP_PLAN_A", name: "Group Plan A - Nuclear Family", minGroupSize: 10, coversSpouse: true, coversChildren: true, coversParents: true, coversParentsInLaw: true },
  { code: "GROUP_PLAN_B", name: "Group Plan B - Extended Family", minGroupSize: 10, coversSpouse: true, coversChildren: true, coversParents: true, coversParentsInLaw: true },
];

async function main() {
  console.log("Seeding roles...");
  const roles: Record<string, string> = {};
  for (const name of ROLE_NAMES) {
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, description: ROLE_LABELS[name] },
      update: { description: ROLE_LABELS[name] },
    });
    roles[name] = role.id;
  }

  console.log("Seeding super admin user...");
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@imothinsurance.co.ke" },
    create: {
      fullName: "System Administrator",
      email: "admin@imothinsurance.co.ke",
      passwordHash,
      roleId: roles["SUPER_ADMIN"],
    },
    update: {},
  });

  console.log("Seeding Dignity product...");
  const product = await prisma.product.upsert({
    where: { name: "Dignity Send-Off Cover" },
    create: { name: "Dignity Send-Off Cover", description: "Dignity Last Expense product" },
    update: {},
  });

  console.log("Seeding Individual/Family plans (Bronze/Silver/Gold)...");
  for (const planDef of INDIVIDUAL_FAMILY_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { productId_code: { productId: product.id, code: planDef.code } },
      create: {
        productId: product.id,
        code: planDef.code,
        name: planDef.name,
        isGroup: false,
        coversSpouse: planDef.coversSpouse,
        coversChildren: planDef.coversChildren,
        coversParents: planDef.coversParents,
        coversParentsInLaw: planDef.coversParentsInLaw,
      },
      update: {
        name: planDef.name,
        isGroup: false,
        coversSpouse: planDef.coversSpouse,
        coversChildren: planDef.coversChildren,
        coversParents: planDef.coversParents,
        coversParentsInLaw: planDef.coversParentsInLaw,
      },
    });

    for (const g of planDef.grades) {
      const benefitOption = await prisma.benefitOption.upsert({
        where: { planId_optionNumber: { planId: plan.id, optionNumber: g.rank } },
        create: { planId: plan.id, optionNumber: g.rank, name: g.grade },
        update: { name: g.grade },
      });

      const existing = await prisma.rateVersion.findFirst({
        where: { benefitOptionId: benefitOption.id, status: "ACTIVE" },
      });
      if (existing) continue;

      await prisma.rateVersion.create({
        data: {
          benefitOptionId: benefitOption.id,
          versionLabel: `${planDef.name} ${g.grade} v1`,
          principalBenefit: g.principal,
          spouseBenefit: g.spouse,
          childBenefit: g.child,
          parentBenefit: g.parent,
          parentInLawBenefit: g.parentInLaw,
          maxChildren: g.maxChildren,
          maxParents: g.maxParents,
          maxParentsInLaw: g.maxParentsInLaw,
          annualRate: g.annualPremium,
          additionalChildRate: g.additionalChildRate,
          minGroupSize: 1,
          ...INDIVIDUAL_FAMILY_RULES,
          claimsLimitNotes:
            "Claims are targeted for settlement within 48 hours of a complete claim submission. Maximum 3 claims per family per year. Maximum lifetime payout of KES 1,000,000 per insured person.",
          status: "ACTIVE",
          effectiveFrom: EFFECTIVE_FROM,
          createdById: admin.id,
          activatedAt: EFFECTIVE_FROM,
          activatedById: admin.id,
        },
      });
    }
  }

  console.log("Seeding Group plans...");
  for (const planDef of GROUP_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { productId_code: { productId: product.id, code: planDef.code } },
      create: {
        productId: product.id,
        code: planDef.code,
        name: planDef.name,
        isGroup: true,
        coversSpouse: planDef.coversSpouse,
        coversChildren: planDef.coversChildren,
        coversParents: planDef.coversParents,
        coversParentsInLaw: planDef.coversParentsInLaw,
      },
      update: {
        name: planDef.name,
        isGroup: true,
        coversSpouse: planDef.coversSpouse,
        coversChildren: planDef.coversChildren,
        coversParents: planDef.coversParents,
        coversParentsInLaw: planDef.coversParentsInLaw,
      },
    });

    for (const tier of GROUP_TIERS) {
      const benefitOption = await prisma.benefitOption.upsert({
        where: { planId_optionNumber: { planId: plan.id, optionNumber: tier.optionNumber } },
        create: { planId: plan.id, optionNumber: tier.optionNumber, name: tier.name },
        update: { name: tier.name },
      });

      const existing = await prisma.rateVersion.findFirst({
        where: { benefitOptionId: benefitOption.id, status: "ACTIVE" },
      });
      if (existing) continue;

      await prisma.rateVersion.create({
        data: {
          benefitOptionId: benefitOption.id,
          versionLabel: `${planDef.name} ${tier.name} v1`,
          principalBenefit: tier.principal,
          spouseBenefit: tier.principal,
          childBenefit: tier.principal * 0.5,
          parentBenefit: tier.principal * 0.5,
          parentInLawBenefit: tier.principal * 0.4,
          maxChildren: 4,
          maxParents: 2,
          maxParentsInLaw: 2,
          annualRate: tier.annualRate,
          additionalChildRate: tier.additionalChildRate,
          minGroupSize: planDef.minGroupSize,
          minAge: 18,
          maxAge: 75,
          minChildAgeMonths: 3,
          maxChildAgeYears: 18,
          minParentAge: 30,
          maxParentAge: 80,
          waitingPeriodDays: 90,
          accidentWaitingPeriodDays: 0,
          gracePeriodDays: 7,
          maxClaimsPerYear: 3,
          maxLifetimeBenefit: 1_000_000,
          claimsLimitNotes:
            "Waiting period does not apply to accidental death. Natural death claims require the standard waiting period to have elapsed.",
          requiresApprovalBelowMin: true,
          status: "ACTIVE",
          effectiveFrom: EFFECTIVE_FROM,
          createdById: admin.id,
          activatedAt: EFFECTIVE_FROM,
          activatedById: admin.id,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
