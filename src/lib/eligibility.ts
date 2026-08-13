import type { RateVersion, RelationshipType } from "@prisma/client";
import { isAgeEligible, isChildAgeEligible } from "@/lib/premium";

export type MemberInput = {
  relationship: RelationshipType;
  fullName: string;
  idNumber?: string | null;
  dob: Date;
  overrideReason?: string | null;
};

export type ClassifiedMember = MemberInput & {
  benefitAmount: number;
  eligible: boolean;
  ineligibilityReason: string | null;
  chargeableExtra: boolean;
  overridden: boolean;
};

/**
 * Money fields come through as Prisma.Decimal on the server and as plain
 * strings/numbers once a RateVersion has been serialized down to a client
 * component prop — accept anything Number() can coerce.
 */
type Money = string | number | { toString(): string };

export type RateLike = Pick<
  RateVersion,
  "minAge" | "maxAge" | "minChildAgeMonths" | "maxChildAgeYears" | "minParentAge" | "maxParentAge" | "maxChildren" | "maxParents" | "maxParentsInLaw"
> & {
  principalBenefit: Money;
  spouseBenefit: Money;
  childBenefit: Money;
  parentBenefit: Money;
  parentInLawBenefit: Money;
  additionalChildRate: Money;
};

export function benefitFor(rate: RateLike, relationship: RelationshipType): number {
  switch (relationship) {
    case "PRINCIPAL":
      return Number(rate.principalBenefit);
    case "SPOUSE":
      return Number(rate.spouseBenefit);
    case "CHILD":
      return Number(rate.childBenefit);
    case "PARENT":
      return Number(rate.parentBenefit);
    case "PARENT_IN_LAW":
      return Number(rate.parentInLawBenefit);
  }
}

/**
 * Applies per-category age rules, coverage caps (max children/parents/
 * parents-in-law), and the brochure's "extra child" charging rule: children
 * beyond the included allowance are covered and billed extra only when the
 * rate defines an additionalChildRate (Extended Family); otherwise they're
 * simply not covered under this tier (Nuclear Family's hard cap of 4).
 *
 * A member who fails these checks can still be admitted if an override
 * reason was supplied (permission for who may supply one is enforced by the
 * caller, not here) — they're then covered at the standard benefit amount
 * and flagged `overridden` so the quotation/audit trail records that this
 * was a deliberate exception, per member.
 */
export function classifyMembers(rate: RateLike, members: MemberInput[]): ClassifiedMember[] {
  let childSlotsUsed = 0;
  let parentSlotsUsed = 0;
  let parentInLawSlotsUsed = 0;

  function finalize(m: MemberInput, natural: Omit<ClassifiedMember, keyof MemberInput | "overridden">): ClassifiedMember {
    if (natural.eligible || !m.overrideReason?.trim()) {
      return { ...m, ...natural, overridden: false };
    }
    return {
      ...m,
      benefitAmount: benefitFor(rate, m.relationship),
      eligible: true,
      ineligibilityReason: natural.ineligibilityReason,
      chargeableExtra: false,
      overridden: true,
    };
  }

  return members.map((m) => {
    const benefitAmount = benefitFor(rate, m.relationship);

    if (m.relationship === "PRINCIPAL" || m.relationship === "SPOUSE") {
      if (m.relationship === "SPOUSE" && benefitAmount === 0) {
        return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: "Spouse is not covered under this plan tier.", chargeableExtra: false });
      }
      const ok = isAgeEligible(m.dob, rate.minAge, rate.maxAge);
      return ok
        ? finalize(m, { benefitAmount, eligible: true, ineligibilityReason: null, chargeableExtra: false })
        : finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Age outside the covered range (${rate.minAge}-${rate.maxAge}) for this plan.`, chargeableExtra: false });
    }

    if (m.relationship === "CHILD") {
      if (rate.maxChildren === 0) {
        return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: "Children are not covered under this plan tier.", chargeableExtra: false });
      }
      const ageOk = isChildAgeEligible(m.dob, rate.minChildAgeMonths, rate.maxChildAgeYears);
      if (!ageOk) {
        return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Age outside the covered range (${rate.minChildAgeMonths} months-${rate.maxChildAgeYears} years) for a child.`, chargeableExtra: false });
      }
      childSlotsUsed++;
      if (childSlotsUsed <= rate.maxChildren) {
        return finalize(m, { benefitAmount, eligible: true, ineligibilityReason: null, chargeableExtra: false });
      }
      const additionalChildRate = Number(rate.additionalChildRate);
      if (additionalChildRate > 0) {
        return finalize(m, { benefitAmount, eligible: true, ineligibilityReason: null, chargeableExtra: true });
      }
      return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Exceeds the maximum of ${rate.maxChildren} children covered under this plan tier.`, chargeableExtra: false });
    }

    // PARENT / PARENT_IN_LAW
    const isParent = m.relationship === "PARENT";
    const max = isParent ? rate.maxParents : rate.maxParentsInLaw;
    const label = isParent ? "parents" : "parents-in-law";
    if (max === 0) {
      return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `${isParent ? "Parents" : "Parents-in-law"} are not covered under this plan tier.`, chargeableExtra: false });
    }
    const ageOk = isAgeEligible(m.dob, rate.minParentAge, rate.maxParentAge);
    if (!ageOk) {
      return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Age outside the covered range (${rate.minParentAge}-${rate.maxParentAge}) for a ${isParent ? "parent" : "parent-in-law"}.`, chargeableExtra: false });
    }
    if (isParent) {
      parentSlotsUsed++;
      if (parentSlotsUsed > max) {
        return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Exceeds the maximum of ${max} ${label} covered under this plan tier.`, chargeableExtra: false });
      }
    } else {
      parentInLawSlotsUsed++;
      if (parentInLawSlotsUsed > max) {
        return finalize(m, { benefitAmount: 0, eligible: false, ineligibilityReason: `Exceeds the maximum of ${max} ${label} covered under this plan tier.`, chargeableExtra: false });
      }
    }
    return finalize(m, { benefitAmount, eligible: true, ineligibilityReason: null, chargeableExtra: false });
  });
}
