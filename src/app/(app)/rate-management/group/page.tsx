import { auth } from "@/auth";
import { getSerializedRateMatrix } from "@/lib/rates";
import { hasPermission } from "@/lib/permissions";
import { RatePlanCard } from "@/components/rate-management/RatePlanCard";

export default async function GroupRatesPage() {
  const session = await auth();
  const plans = await getSerializedRateMatrix(true);
  const canEdit = hasPermission(session!.user.role, "rates.edit");
  const canCreate = hasPermission(session!.user.role, "rates.create");
  const canDeactivate = hasPermission(session!.user.role, "rates.deactivate");

  return (
    <div className="space-y-6 pt-2">
      <p className="text-sm text-imoth-grey-muted">
        Group rate set — kept separate from Individual/Family rates and edited independently.
      </p>

      {plans.map((plan) => (
        <RatePlanCard key={plan.id} plan={plan} canEdit={canEdit} canCreate={canCreate} canDeactivate={canDeactivate} />
      ))}
    </div>
  );
}
