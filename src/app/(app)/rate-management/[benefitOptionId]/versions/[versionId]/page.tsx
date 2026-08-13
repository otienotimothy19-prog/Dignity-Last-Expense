import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Copy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { activateRateVersion, deactivateRateVersion } from "../../../actions";

const COMPARE_FIELDS: { key: keyof NonNullable<Awaited<ReturnType<typeof loadVersion>>>; label: string; money?: boolean }[] = [
  { key: "principalBenefit", label: "Principal benefit", money: true },
  { key: "spouseBenefit", label: "Spouse benefit", money: true },
  { key: "childBenefit", label: "Child benefit", money: true },
  { key: "parentBenefit", label: "Parent benefit", money: true },
  { key: "parentInLawBenefit", label: "Parent-in-law benefit", money: true },
  { key: "annualRate", label: "Annual premium / rate", money: true },
  { key: "additionalChildRate", label: "Additional child premium", money: true },
  { key: "maxChildren", label: "Included children" },
  { key: "maxParents", label: "Maximum parents" },
  { key: "maxParentsInLaw", label: "Maximum parents-in-law" },
  { key: "minAge", label: "Min principal/spouse age" },
  { key: "maxAge", label: "Max principal/spouse age" },
  { key: "minChildAgeMonths", label: "Min child age (months)" },
  { key: "maxChildAgeYears", label: "Max child age (years)" },
  { key: "minParentAge", label: "Min parent age" },
  { key: "maxParentAge", label: "Max parent age" },
  { key: "waitingPeriodDays", label: "Natural death waiting period (days)" },
  { key: "accidentWaitingPeriodDays", label: "Accident waiting period (days)" },
  { key: "gracePeriodDays", label: "Grace period (days)" },
  { key: "maxClaimsPerYear", label: "Max claims / year" },
  { key: "maxLifetimeBenefit", label: "Max lifetime benefit", money: true },
];

async function loadVersion(versionId: string) {
  return prisma.rateVersion.findUnique({
    where: { id: versionId },
    include: { benefitOption: { include: { plan: true } } },
  });
}

export default async function RateVersionDetailPage({
  params,
}: {
  params: Promise<{ benefitOptionId: string; versionId: string }>;
}) {
  const { benefitOptionId, versionId } = await params;
  const session = await auth();
  const version = await loadVersion(versionId);
  if (!version) notFound();

  const current =
    version.status === "ACTIVE"
      ? null
      : await prisma.rateVersion.findFirst({
          where: { benefitOptionId, status: "ACTIVE" },
          include: { benefitOption: { include: { plan: true } } },
        });

  const canActivate = hasPermission(session!.user.role, "rates.activate");
  const canDeactivate = hasPermission(session!.user.role, "rates.deactivate");

  const activateAction = activateRateVersion.bind(null, benefitOptionId, versionId);
  const deactivateAction = deactivateRateVersion.bind(null, benefitOptionId, versionId);

  const isPending = version.status === "DRAFT" || version.status === "SCHEDULED";
  const readyToActivate = version.status === "SCHEDULED" && version.effectiveFrom <= new Date();

  return (
    <div className="max-w-3xl space-y-6 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-imoth-grey-muted">
            {version.benefitOption.plan.name} / {version.benefitOption.name}
          </p>
          <h1 className="text-lg font-bold text-imoth-navy">{version.versionLabel}</h1>
        </div>
        <StatusBadge status={version.status} />
      </div>

      {version.status === "ACTIVE" && (
        <div className="flex items-center gap-3 rounded-xl border border-status-green/30 bg-green-50 px-4 py-3.5">
          <BadgeCheck className="h-5 w-5 shrink-0 text-status-green" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-status-green">Active Rate Version</p>
            <p className="text-sm text-green-800">Effective since {formatDateNairobi(version.effectiveFrom)}</p>
          </div>
        </div>
      )}

      {version.status === "SCHEDULED" && !readyToActivate && (
        <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
          Scheduled to take effect on {formatDateNairobi(version.effectiveFrom)}. There is no automated
          scheduler in this system yet — an administrator must return here on or after that date and
          activate it manually.
        </div>
      )}
      {readyToActivate && (
        <div className="rounded-xl bg-orange-50 p-4 text-sm font-medium text-orange-800">
          This version&apos;s effective date has arrived. Activate it to make it live.
        </div>
      )}

      {isPending && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-imoth-navy">
            Comparison vs {current ? current.versionLabel : "no active version"}
          </h2>
          <TableCard>
            <Table>
              <THead>
                <Th>Field</Th>
                <Th>Current</Th>
                <Th>Proposed</Th>
              </THead>
              <TBody>
                {COMPARE_FIELDS.map((f) => {
                  const oldVal = current ? current[f.key] : null;
                  const newVal = version[f.key];
                  const changed = String(oldVal ?? "") !== String(newVal ?? "");
                  return (
                    <Tr key={String(f.key)} className={changed ? "bg-orange-50/60" : ""}>
                      <Td className="text-imoth-grey-muted">{f.label}</Td>
                      <Td>{oldVal === null ? "—" : f.money ? formatKES(String(oldVal)) : String(oldVal)}</Td>
                      <Td className={changed ? "font-semibold text-orange-800" : ""}>
                        {f.money ? formatKES(String(newVal)) : String(newVal)}
                      </Td>
                    </Tr>
                  );
                })}
                <Tr>
                  <Td className="text-imoth-grey-muted">Effective from</Td>
                  <Td>{current ? formatDateNairobi(current.effectiveFrom) : "—"}</Td>
                  <Td className="font-semibold text-orange-800">{formatDateNairobi(version.effectiveFrom)}</Td>
                </Tr>
              </TBody>
            </Table>
          </TableCard>
        </div>
      )}

      {!isPending && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-imoth-navy">Details</h2>
          <TableCard>
            <Table>
              <TBody>
                {COMPARE_FIELDS.map((f) => (
                  <Tr key={String(f.key)}>
                    <Td className="text-imoth-grey-muted">{f.label}</Td>
                    <Td className="font-medium">{f.money ? formatKES(String(version[f.key])) : String(version[f.key])}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td className="text-imoth-grey-muted">Effective from</Td>
                  <Td className="font-medium">{formatDateNairobi(version.effectiveFrom)}</Td>
                </Tr>
                <Tr>
                  <Td className="text-imoth-grey-muted">Effective to</Td>
                  <Td className="font-medium">{version.effectiveTo ? formatDateNairobi(version.effectiveTo) : "—"}</Td>
                </Tr>
              </TBody>
            </Table>
          </TableCard>
        </div>
      )}

      {version.claimsLimitNotes && (
        <div className="rounded-xl border border-imoth-grey-border bg-white p-4 text-sm text-imoth-grey-muted">
          {version.claimsLimitNotes}
        </div>
      )}

      {isPending && canActivate && (
        <form action={activateAction} className="rounded-xl border border-imoth-grey-border bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-imoth-navy">
            Reason for this rate change (required)
            <textarea
              name="reason"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
              placeholder="e.g. Annual premium revision approved by underwriting, effective 1 Sept 2026"
            />
          </label>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-imoth-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-imoth-red-dark"
          >
            {readyToActivate || version.effectiveFrom <= new Date() ? "Confirm & activate" : "Confirm & schedule"}
          </button>
        </form>
      )}

      {version.status === "ACTIVE" && canDeactivate && (
        <form action={deactivateAction} className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="mb-3 text-sm text-status-red">
            Deactivating this version leaves this Tier/Grade with no active rate until a new one is
            activated — new quotations against it will be blocked.
          </p>
          <label className="block text-sm font-medium text-imoth-navy">
            Reason for deactivating (required)
            <textarea
              name="reason"
              required
              rows={2}
              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="mt-4 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-status-red hover:bg-red-50"
          >
            Deactivate
          </button>
        </form>
      )}

      <Link
        href={`/rate-management/${benefitOptionId}/new?cloneFrom=${version.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-imoth-blue hover:underline"
      >
        <Copy className="h-3.5 w-3.5" /> Clone this version into a new draft
      </Link>
    </div>
  );
}
