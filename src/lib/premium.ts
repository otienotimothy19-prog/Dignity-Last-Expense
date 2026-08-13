import type { RateVersion } from "@prisma/client";

export type PremiumInput = {
  numContributors: number;
  numAdditionalChildren: number;
};

export type PremiumResult = {
  basePremium: number;
  additionalChildPremium: number;
  totalPremium: number;
  minGroupSizeMet: boolean;
  requiresApproval: boolean;
};

/**
 * Premiums must always come from the applicable stored rate version — never
 * hard-code rates here. `rate` is the exact RateVersion snapshot the
 * quotation/policy is being built against.
 */
export function calculatePremium(
  rate: Pick<RateVersion, "annualRate" | "additionalChildRate" | "minGroupSize" | "requiresApprovalBelowMin">,
  input: PremiumInput
): PremiumResult {
  const annualRate = Number(rate.annualRate);
  const additionalChildRate = Number(rate.additionalChildRate);

  const basePremium = input.numContributors * annualRate;
  const additionalChildPremium = input.numAdditionalChildren * additionalChildRate;
  const totalPremium = basePremium + additionalChildPremium;

  const minGroupSizeMet = input.numContributors >= rate.minGroupSize;
  const requiresApproval = !minGroupSizeMet && rate.requiresApprovalBelowMin;

  return {
    basePremium,
    additionalChildPremium,
    totalPremium,
    minGroupSizeMet,
    requiresApproval,
  };
}

export function calculateAge(dob: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isAgeEligible(dob: Date, minAge: number, maxAge: number, asOf: Date = new Date()): boolean {
  const age = calculateAge(dob, asOf);
  return age >= minAge && age <= maxAge;
}

export function calculateAgeInMonths(dob: Date, asOf: Date = new Date()): number {
  return (asOf.getFullYear() - dob.getFullYear()) * 12 + (asOf.getMonth() - dob.getMonth());
}

export function isChildAgeEligible(
  dob: Date,
  minAgeMonths: number,
  maxAgeYears: number,
  asOf: Date = new Date()
): boolean {
  const months = calculateAgeInMonths(dob, asOf);
  return months >= minAgeMonths && months <= maxAgeYears * 12;
}
