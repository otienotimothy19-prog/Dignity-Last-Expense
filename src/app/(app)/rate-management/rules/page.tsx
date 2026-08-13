import { auth } from "@/auth";
import { getSerializedRateMatrix } from "@/lib/rates";
import { hasPermission } from "@/lib/permissions";
import { RatePlanCard } from "@/components/rate-management/RatePlanCard";

export default async function ProductRulesPage() {
  const session = await auth();
  const [individualPlans, groupPlans] = await Promise.all([
    getSerializedRateMatrix(false),
    getSerializedRateMatrix(true),
  ]);
  const allPlans = [...individualPlans, ...groupPlans];

  const canEdit = hasPermission(session!.user.role, "rates.edit");
  const canCreate = hasPermission(session!.user.role, "rates.create");
  const canDeactivate = hasPermission(session!.user.role, "rates.deactivate");

  return (
    <div className="space-y-6 pt-2">
      <p className="text-sm text-imoth-grey-muted">
        Age limits, waiting periods, grace period, claims and lifetime payout for every Tier/Grade
        and Group Option — editable right here. Click <strong>Edit</strong> on a row, then open{" "}
        <strong>Advanced Settings</strong> to change any rule field. These are the same rate
        records shown on the Individual/Family and Group Rates tabs — editing here creates a new
        rate version exactly the same way.
      </p>

      {allPlans.map((plan) => (
        <RatePlanCard
          key={plan.id}
          plan={plan}
          canEdit={canEdit}
          canCreate={canCreate}
          canDeactivate={canDeactivate}
          defaultOpen
          defaultAdvancedOpen
          viewMode="rules"
        />
      ))}
    </div>
  );
}
