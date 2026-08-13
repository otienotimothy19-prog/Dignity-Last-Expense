// Shared definition of every editable RateVersion field, used by the inline
// rate table (client), the diff/confirm modal, and the server-side audit
// diff computation — one source of truth for "what counts as a rate field".
export type RateFieldKey =
  | "principalBenefit"
  | "spouseBenefit"
  | "childBenefit"
  | "parentBenefit"
  | "parentInLawBenefit"
  | "annualRate"
  | "additionalChildRate"
  | "maxChildren"
  | "maxParents"
  | "maxParentsInLaw"
  | "minGroupSize"
  | "minAge"
  | "maxAge"
  | "minChildAgeMonths"
  | "maxChildAgeYears"
  | "minParentAge"
  | "maxParentAge"
  | "waitingPeriodDays"
  | "accidentWaitingPeriodDays"
  | "gracePeriodDays"
  | "maxClaimsPerYear"
  | "maxLifetimeBenefit"
  | "claimsSettlementHours"
  | "policyDurationMonths";

export type RateFieldDef = {
  key: RateFieldKey;
  label: string;
  money?: boolean;
  advanced?: boolean;
  group: "core" | "advanced";
};

export const RATE_FIELD_DEFS: RateFieldDef[] = [
  { key: "principalBenefit", label: "Principal benefit", money: true, group: "core" },
  { key: "spouseBenefit", label: "Spouse benefit", money: true, group: "core" },
  { key: "childBenefit", label: "Child benefit", money: true, group: "core" },
  { key: "parentBenefit", label: "Parent benefit", money: true, group: "core" },
  { key: "parentInLawBenefit", label: "Parent-in-law benefit", money: true, group: "core" },
  { key: "annualRate", label: "Annual premium / rate", money: true, group: "core" },
  { key: "additionalChildRate", label: "Additional child premium", money: true, group: "core" },
  { key: "maxChildren", label: "Included children", group: "core" },
  { key: "maxParents", label: "Maximum parents", group: "advanced" },
  { key: "maxParentsInLaw", label: "Maximum parents-in-law", group: "advanced" },
  { key: "minGroupSize", label: "Minimum group size", group: "advanced" },
  { key: "minAge", label: "Min principal/spouse age", group: "advanced" },
  { key: "maxAge", label: "Max principal/spouse age", group: "advanced" },
  { key: "minChildAgeMonths", label: "Min child age (months)", group: "advanced" },
  { key: "maxChildAgeYears", label: "Max child age (years)", group: "advanced" },
  { key: "minParentAge", label: "Min parent age", group: "advanced" },
  { key: "maxParentAge", label: "Max parent age", group: "advanced" },
  { key: "waitingPeriodDays", label: "Natural death waiting period (days)", group: "advanced" },
  { key: "accidentWaitingPeriodDays", label: "Accident waiting period (days)", group: "advanced" },
  { key: "gracePeriodDays", label: "Grace period (days)", group: "advanced" },
  { key: "maxClaimsPerYear", label: "Max claims / year", group: "advanced" },
  { key: "maxLifetimeBenefit", label: "Max lifetime benefit", money: true, group: "advanced" },
  { key: "claimsSettlementHours", label: "Claims settlement target (hours)", group: "advanced" },
  { key: "policyDurationMonths", label: "Policy duration (months)", group: "advanced" },
];

export const CORE_RATE_FIELDS = RATE_FIELD_DEFS.filter((f) => f.group === "core");
export const ADVANCED_RATE_FIELDS = RATE_FIELD_DEFS.filter((f) => f.group === "advanced");
