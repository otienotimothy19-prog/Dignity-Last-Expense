import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getIndividualFamilyTiers } from "@/lib/plan-options";
import { canOverrideEligibility, hasPermission } from "@/lib/permissions";
import { IndividualQuotationForm } from "./IndividualQuotationForm";

export default async function NewIndividualQuotationPage() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.create")) {
    redirect("/quotations");
  }
  const tiers = await getIndividualFamilyTiers();
  const allowOverride = canOverrideEligibility(session.user.role);
  return <IndividualQuotationForm tiers={tiers} allowOverride={allowOverride} />;
}
