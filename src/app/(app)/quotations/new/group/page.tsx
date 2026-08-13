import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSelectableBenefitOptions } from "@/lib/plan-options";
import { canOverrideEligibility, hasPermission } from "@/lib/permissions";
import { GroupQuotationForm } from "./GroupQuotationForm";

export default async function NewGroupQuotationPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.create")) {
    redirect("/quotations");
  }
  const options = await getSelectableBenefitOptions(true);
  return (
    <GroupQuotationForm
      allowOverride={canOverrideEligibility(session.user.role)}
      options={options.map((o) => ({
        benefitOptionId: o.benefitOptionId,
        planName: o.planName,
        optionName: o.optionName,
        rate: {
          minGroupSize: o.rate.minGroupSize,
          annualRate: o.rate.annualRate.toString(),
          additionalChildRate: o.rate.additionalChildRate.toString(),
          principalBenefit: o.rate.principalBenefit.toString(),
          spouseBenefit: o.rate.spouseBenefit.toString(),
          childBenefit: o.rate.childBenefit.toString(),
          parentBenefit: o.rate.parentBenefit.toString(),
          parentInLawBenefit: o.rate.parentInLawBenefit.toString(),
          minAge: o.rate.minAge,
          maxAge: o.rate.maxAge,
          minChildAgeMonths: o.rate.minChildAgeMonths,
          maxChildAgeYears: o.rate.maxChildAgeYears,
          minParentAge: o.rate.minParentAge,
          maxParentAge: o.rate.maxParentAge,
          maxChildren: o.rate.maxChildren,
          maxParents: o.rate.maxParents,
          maxParentsInLaw: o.rate.maxParentsInLaw,
        },
      }))}
    />
  );
}
