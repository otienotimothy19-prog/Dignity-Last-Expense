import type { RateFieldKey } from "@/lib/rate-fields";

// Plain, serializable shape for a RateVersion — Prisma's Decimal fields must
// be converted to numbers before crossing the server/client boundary.
export type RateValues = Record<RateFieldKey, number> & {
  paymentFrequency: string;
  claimsLimitNotes: string;
};

export type SerializedRate = RateValues & {
  id: string;
  versionLabel: string;
  status: string;
  effectiveFrom: string; // yyyy-mm-dd
  requiresApprovalBelowMin: boolean;
};

export type SerializedOption = {
  id: string;
  optionNumber: number;
  name: string;
  isActive: boolean;
  activeRate: SerializedRate | null;
};

export type SerializedPlan = {
  id: string;
  name: string;
  isGroup: boolean;
  coversSpouse: boolean;
  coversChildren: boolean;
  coversParents: boolean;
  coversParentsInLaw: boolean;
  options: SerializedOption[];
};

export const DEFAULT_RATE_VALUES: RateValues = {
  principalBenefit: 0,
  spouseBenefit: 0,
  childBenefit: 0,
  parentBenefit: 0,
  parentInLawBenefit: 0,
  annualRate: 0,
  additionalChildRate: 0,
  maxChildren: 0,
  maxParents: 0,
  maxParentsInLaw: 0,
  minGroupSize: 1,
  minAge: 18,
  maxAge: 70,
  minChildAgeMonths: 3,
  maxChildAgeYears: 18,
  minParentAge: 30,
  maxParentAge: 80,
  waitingPeriodDays: 90,
  accidentWaitingPeriodDays: 0,
  gracePeriodDays: 7,
  maxClaimsPerYear: 3,
  maxLifetimeBenefit: 1_000_000,
  claimsSettlementHours: 48,
  policyDurationMonths: 12,
  paymentFrequency: "ANNUAL",
  claimsLimitNotes: "",
};
