import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { createDraftRateVersion } from "../../actions";

export default async function NewRateVersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ benefitOptionId: string }>;
  searchParams: Promise<{ cloneFrom?: string }>;
}) {
  const { benefitOptionId } = await params;
  const { cloneFrom } = await searchParams;
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.create")) {
    return <p className="pt-4 text-sm text-status-red">You are not authorized to create rate versions.</p>;
  }

  const benefitOption = await prisma.benefitOption.findUnique({
    where: { id: benefitOptionId },
    include: { plan: true },
  });
  if (!benefitOption) notFound();

  const base = cloneFrom
    ? await prisma.rateVersion.findUnique({ where: { id: cloneFrom } })
    : await prisma.rateVersion.findFirst({ where: { benefitOptionId, status: "ACTIVE" } });

  const action = createDraftRateVersion.bind(null, benefitOptionId, cloneFrom ?? null);
  const d = (v: unknown, fallback: string) => (v === undefined || v === null ? fallback : String(v));

  return (
    <div className="max-w-3xl pt-4">
      <h1 className="text-lg font-bold text-imoth-navy">
        New Rate Version — {benefitOption.plan.name} / {benefitOption.name}
      </h1>
      <p className="mt-1 text-sm text-imoth-grey-muted">
        {cloneFrom
          ? `Cloned from a previous rate version. `
          : base
            ? "Prefilled from the currently active rate. "
            : ""}
        This is saved as a draft — it will not affect quotations until you preview and activate it.
      </p>

      <form action={action} className="mt-6 space-y-6">
        <Section title="Identity & effective date">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Version label" name="versionLabel" defaultValue={d(base?.versionLabel, `${benefitOption.plan.name} ${benefitOption.name} v2`)} type="text" />
            <Field label="Effective from" name="effectiveFrom" defaultValue={new Date().toISOString().slice(0, 10)} type="date" />
          </div>
        </Section>

        <Section title="Benefits (KES)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Principal benefit" name="principalBenefit" defaultValue={d(base?.principalBenefit, "")} type="number" />
            <Field label="Spouse benefit" name="spouseBenefit" defaultValue={d(base?.spouseBenefit, "0")} type="number" />
            <Field label="Child benefit" name="childBenefit" defaultValue={d(base?.childBenefit, "0")} type="number" />
            <Field label="Parent benefit" name="parentBenefit" defaultValue={d(base?.parentBenefit, "0")} type="number" />
            <Field label="Parent-in-law benefit" name="parentInLawBenefit" defaultValue={d(base?.parentInLawBenefit, "0")} type="number" />
          </div>
        </Section>

        <Section title="Premium">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Annual premium / rate per contributor (KES)" name="annualRate" defaultValue={d(base?.annualRate, "")} type="number" />
            <Field label="Additional child premium (KES)" name="additionalChildRate" defaultValue={d(base?.additionalChildRate, "0")} type="number" />
          </div>
        </Section>

        <Section title="Coverage limits">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Included children" name="maxChildren" defaultValue={d(base?.maxChildren, "0")} type="number" />
            <Field label="Maximum parents" name="maxParents" defaultValue={d(base?.maxParents, "0")} type="number" />
            <Field label="Maximum parents-in-law" name="maxParentsInLaw" defaultValue={d(base?.maxParentsInLaw, "0")} type="number" />
            <Field label="Minimum group size (group plans only)" name="minGroupSize" defaultValue={d(base?.minGroupSize, "1")} type="number" />
          </div>
        </Section>

        <Section title="Age limits">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Minimum principal/spouse age" name="minAge" defaultValue={d(base?.minAge, "18")} type="number" />
            <Field label="Maximum principal/spouse age" name="maxAge" defaultValue={d(base?.maxAge, "70")} type="number" />
            <Field label="Minimum child age (months)" name="minChildAgeMonths" defaultValue={d(base?.minChildAgeMonths, "3")} type="number" />
            <Field label="Maximum child age (years)" name="maxChildAgeYears" defaultValue={d(base?.maxChildAgeYears, "18")} type="number" />
            <Field label="Minimum parent age" name="minParentAge" defaultValue={d(base?.minParentAge, "30")} type="number" />
            <Field label="Maximum parent age" name="maxParentAge" defaultValue={d(base?.maxParentAge, "80")} type="number" />
          </div>
        </Section>

        <Section title="Waiting periods, grace period & claims">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Natural death waiting period (days)" name="waitingPeriodDays" defaultValue={d(base?.waitingPeriodDays, "90")} type="number" />
            <Field label="Accident waiting period (days)" name="accidentWaitingPeriodDays" defaultValue={d(base?.accidentWaitingPeriodDays, "0")} type="number" />
            <Field label="Grace period (days)" name="gracePeriodDays" defaultValue={d(base?.gracePeriodDays, "7")} type="number" />
            <Field label="Maximum claims per year" name="maxClaimsPerYear" defaultValue={d(base?.maxClaimsPerYear, "3")} type="number" />
            <Field label="Maximum lifetime benefit (KES)" name="maxLifetimeBenefit" defaultValue={d(base?.maxLifetimeBenefit, "1000000")} type="number" />
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-imoth-navy">
            <input
              type="checkbox"
              name="requiresApprovalBelowMin"
              defaultChecked={base?.requiresApprovalBelowMin ?? false}
              className="h-4 w-4 rounded border-imoth-grey-border"
            />
            Require underwriter approval when membership is below minimum group size
          </label>

          <label className="mt-4 block text-sm font-medium text-imoth-navy">
            Claims notes
            <textarea
              name="claimsLimitNotes"
              defaultValue={base?.claimsLimitNotes ?? ""}
              rows={3}
              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
            />
          </label>
        </Section>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="rounded-lg bg-imoth-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-imoth-red-dark"
          >
            Save draft & preview
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-imoth-grey-border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-imoth-navy">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type: string;
}) {
  return (
    <label className="text-sm font-medium text-imoth-navy">
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        defaultValue={defaultValue}
        required
        className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
      />
    </label>
  );
}
