"use client";

import { useMemo, useRef, useState } from "react";
import { formatKES } from "@/lib/format";
import { Stepper } from "@/components/ui/Stepper";
import {
  buildGroupScheduleTemplate,
  evaluateGroupSchedule,
  parseGroupScheduleCsv,
  type ScheduleRow,
} from "@/lib/group-schedule";
import type { RelationshipType } from "@prisma/client";
import { createGroupQuotationAction } from "./actions";

const STEPS = ["Group", "Cover", "Members", "Beneficiaries", "Premium", "Review"];
const GROUP_TYPES = ["SACCO", "CHURCH", "CHAMA", "SME", "EMPLOYER", "OTHER"];
const RELATIONSHIPS: RelationshipType[] = ["PRINCIPAL", "SPOUSE", "CHILD", "PARENT", "PARENT_IN_LAW"];

export type GroupBenefitOption = {
  benefitOptionId: string;
  planName: string;
  optionName: string;
  rate: {
    minGroupSize: number;
    annualRate: string;
    additionalChildRate: string;
    principalBenefit: string;
    spouseBenefit: string;
    childBenefit: string;
    parentBenefit: string;
    parentInLawBenefit: string;
    minAge: number;
    maxAge: number;
    minChildAgeMonths: number;
    maxChildAgeYears: number;
    minParentAge: number;
    maxParentAge: number;
    maxChildren: number;
    maxParents: number;
    maxParentsInLaw: number;
  };
};

type Preview = {
  numContributors: number;
  numAdditionalChildren: number;
  basePremium: number;
  additionalChildPremium: number;
  totalPremium: number;
  minGroupSizeMet: boolean;
  minGroupSize: number;
};

type EditableRow = { relationship: RelationshipType | ""; fullName: string; idNumber: string; dobRaw: string };
type BeneficiaryDraft = { fullName: string; relationship: string; phone: string };

const emptyRow: EditableRow = { relationship: "", fullName: "", idNumber: "", dobRaw: "" };
const emptyBeneficiary: BeneficiaryDraft = { fullName: "", relationship: "", phone: "" };

function toScheduleRow(row: EditableRow, index: number): ScheduleRow {
  const dobValid = !!row.dobRaw && !Number.isNaN(new Date(row.dobRaw).getTime());
  return {
    line: index + 2,
    relationship: row.relationship || null,
    fullName: row.fullName.trim(),
    idNumber: row.idNumber.trim() || null,
    dobRaw: row.dobRaw.trim(),
    parseError: !row.relationship
      ? "Select a relationship."
      : !row.fullName.trim()
        ? "Missing full name."
        : !dobValid
          ? "Missing or invalid date of birth."
          : null,
  };
}

function serializeRowsToCsv(rows: EditableRow[]): string {
  const lines = ["Relationship,FullName,IDOrBirthCertificate,DateOfBirth"];
  for (const r of rows) {
    lines.push([r.relationship, r.fullName, r.idNumber, r.dobRaw].join(","));
  }
  return lines.join("\r\n");
}

export function GroupQuotationForm({ options, allowOverride }: { options: GroupBenefitOption[]; allowOverride: boolean }) {
  const [step, setStep] = useState(1);
  const [benefitOptionId, setBenefitOptionId] = useState("");
  const [summaryPreview, setSummaryPreview] = useState<Preview | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"summary" | "schedule">("summary");
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({});
  const [familyBeneficiaries, setFamilyBeneficiaries] = useState<Record<number, BeneficiaryDraft>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // A "family" is one contributor (PRINCIPAL row) plus their dependants —
  // each gets exactly one beneficiary. Only meaningful in schedule mode,
  // since summary mode has no named contributors to attach a beneficiary to.
  const familyRowIndices = useMemo(
    () => rows.map((r, i) => ({ r, i })).filter(({ r }) => r.relationship === "PRINCIPAL").map(({ i }) => i),
    [rows]
  );

  function updateBeneficiary(rowIndex: number, patch: Partial<BeneficiaryDraft>) {
    setFamilyBeneficiaries((prev) => ({ ...prev, [rowIndex]: { ...emptyBeneficiary, ...prev[rowIndex], ...patch } }));
  }

  const selected = options.find((o) => o.benefitOptionId === benefitOptionId);

  const scheduleRows = useMemo(() => rows.map(toScheduleRow), [rows]);
  const summary = useMemo(() => {
    if (!selected || scheduleRows.length === 0) return null;
    return evaluateGroupSchedule(selected.rate, scheduleRows, overrideReasons);
  }, [selected, scheduleRows, overrideReasons]);

  const scheduleUnresolved = scheduleMode === "schedule" && (rows.length === 0 || (summary?.hasUnresolvedErrors ?? true));

  // In schedule mode the preview is fully derived from the validated
  // schedule, so it's computed directly rather than via setState.
  const schedulePreview: Preview | null = useMemo(() => {
    if (!selected || !summary) return null;
    const annualRate = Number(selected.rate.annualRate);
    const additionalChildRate = Number(selected.rate.additionalChildRate);
    const basePremium = summary.counts.numContributors * annualRate;
    const additionalChildPremium = summary.counts.numAdditionalChildren * additionalChildRate;
    return {
      numContributors: summary.counts.numContributors,
      numAdditionalChildren: summary.counts.numAdditionalChildren,
      basePremium,
      additionalChildPremium,
      totalPremium: basePremium + additionalChildPremium,
      minGroupSizeMet: summary.counts.numContributors >= selected.rate.minGroupSize,
      minGroupSize: selected.rate.minGroupSize,
    };
  }, [selected, summary]);

  const preview = scheduleMode === "schedule" ? schedulePreview : summaryPreview;

  function recalcPreview() {
    if (!selected || !formRef.current) {
      setSummaryPreview(null);
      return;
    }
    const fd = new FormData(formRef.current);
    const numContributors = Number(fd.get("numContributors") ?? 0);
    const numAdditionalChildren = Number(fd.get("numAdditionalChildren") ?? 0);
    const annualRate = Number(selected.rate.annualRate);
    const additionalChildRate = Number(selected.rate.additionalChildRate);
    const basePremium = numContributors * annualRate;
    const additionalChildPremium = numAdditionalChildren * additionalChildRate;
    setSummaryPreview({
      numContributors,
      numAdditionalChildren,
      basePremium,
      additionalChildPremium,
      totalPremium: basePremium + additionalChildPremium,
      minGroupSizeMet: numContributors >= selected.rate.minGroupSize,
      minGroupSize: selected.rate.minGroupSize,
    });
  }

  function handleCsvUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseGroupScheduleCsv(text);
      setRows(
        parsed.map((r) => ({
          relationship: r.relationship ?? "",
          fullName: r.fullName,
          idNumber: r.idNumber ?? "",
          dobRaw: r.dobRaw,
        }))
      );
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const csv = buildGroupScheduleTemplate();
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "dignity-group-member-schedule-template.csv";
    a.click();
  }

  function updateRow(index: number, patch: Partial<EditableRow>) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const goNext = () => {
    const stepEl = formRef.current?.querySelector(`[data-step="${step}"]`);
    const invalidField = stepEl?.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
    if (invalidField) {
      invalidField.reportValidity();
      return;
    }
    setStep((s) => Math.min(6, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div className="max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-imoth-navy">New Group Quotation</h1>
        <p className="mt-1 text-sm text-imoth-grey-muted">
          If membership is below the plan&apos;s minimum group size, the quotation is still prepared,
          marked subject to underwriter approval.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-imoth-grey-border bg-white p-4 shadow-sm">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          ref={formRef}
          action={createGroupQuotationAction}
          onChange={recalcPreview}
          className="space-y-6 lg:col-span-2"
        >
          <input type="hidden" name="scheduleMode" value={scheduleMode} />
          <input type="hidden" name="scheduleCsv" value={scheduleMode === "schedule" ? serializeRowsToCsv(rows) : ""} />
          <input type="hidden" name="overrideReasonsJson" value={JSON.stringify(overrideReasons)} />
          <input
            type="hidden"
            name="beneficiariesJson"
            value={JSON.stringify(
              scheduleMode === "schedule"
                ? familyRowIndices
                    .map((i) => familyBeneficiaries[i])
                    .filter((b): b is BeneficiaryDraft => !!b?.fullName.trim())
                : []
            )}
          />

          <div data-step={1} className={step === 1 ? "" : "hidden"}>
            <Section title="Group details">
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Group name" name="name" required className="col-span-2" />
                <label className="text-sm font-medium text-imoth-navy">
                  Group type
                  <select name="groupType" required className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm">
                    {GROUP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField label="Registration number" name="registrationNumber" />
                <TextField label="KRA PIN" name="kraPin" />
                <TextField label="Contact person" name="contactPerson" required />
                <TextField label="Phone" name="phone" required />
                <TextField label="Email" name="email" type="email" />
                <TextField label="Address / Location" name="address" className="col-span-2" />
              </div>
            </Section>
          </div>

          <div data-step={2} className={step === 2 ? "" : "hidden"}>
            <Section title="Cover — Plan & Option">
              <label className="text-sm font-medium text-imoth-navy">
                Select plan and option
                <select
                  name="benefitOptionId"
                  required
                  value={benefitOptionId}
                  onChange={(e) => {
                    setBenefitOptionId(e.target.value);
                    setTimeout(recalcPreview, 0);
                  }}
                  className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm"
                >
                  <option value="">-- select --</option>
                  {options.map((o) => (
                    <option key={o.benefitOptionId} value={o.benefitOptionId}>
                      {o.planName} — {o.optionName} (min group {o.rate.minGroupSize}, annual rate/contributor{" "}
                      {formatKES(o.rate.annualRate)})
                    </option>
                  ))}
                </select>
              </label>
            </Section>
          </div>

          <div data-step={3} className={step === 3 ? "" : "hidden"}>
            <Section title="Member schedule">
              <div className="mb-4 flex gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-imoth-navy">
                  <input
                    type="radio"
                    checked={scheduleMode === "summary"}
                    onChange={() => setScheduleMode("summary")}
                  />
                  Summary only (counts)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-imoth-navy">
                  <input
                    type="radio"
                    checked={scheduleMode === "schedule"}
                    onChange={() => setScheduleMode("schedule")}
                  />
                  Full member schedule
                </label>
              </div>

              {scheduleMode === "summary" ? (
                <div className="grid grid-cols-2 gap-4">
                  <NumberField label="Number of contributors" name="numContributors" required />
                  <NumberField label="Number of spouses" name="numSpouses" />
                  <NumberField label="Number of children" name="numChildren" />
                  <NumberField label="Additional children beyond standard allowance" name="numAdditionalChildren" />
                  <NumberField label="Number of parents" name="numParents" />
                  <NumberField label="Number of parents-in-law" name="numParentsInLaw" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="rounded-lg border border-imoth-grey-border px-4 py-2 text-xs font-semibold text-imoth-navy hover:bg-imoth-grey-bg"
                    >
                      Download CSV template
                    </button>
                    <label className="rounded-lg border border-imoth-grey-border px-4 py-2 text-xs font-semibold text-imoth-navy hover:bg-imoth-grey-bg cursor-pointer">
                      Upload CSV
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCsvUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setRows((r) => [...r, { ...emptyRow }])}
                      className="rounded-lg border border-imoth-grey-border px-4 py-2 text-xs font-semibold text-imoth-navy hover:bg-imoth-grey-bg"
                    >
                      + Add row
                    </button>
                  </div>
                  <p className="text-xs text-imoth-grey-muted">
                    Each PRINCIPAL row starts a new contributor; SPOUSE/CHILD/PARENT/PARENT_IN_LAW rows placed
                    directly after it are treated as that contributor&apos;s dependants.
                  </p>

                  {summary && (
                    <div className="flex gap-4 rounded-lg bg-imoth-grey-bg p-3 text-xs font-medium">
                      <span className="text-green-700">{summary.validCount} valid</span>
                      <span className="text-imoth-red-dark">{summary.invalidCount} invalid</span>
                      <span className="text-orange-600">{summary.duplicateCount} duplicate</span>
                    </div>
                  )}

                  {rows.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-imoth-grey-border">
                      <table className="w-full text-xs">
                        <thead className="bg-imoth-grey-bg text-left text-imoth-grey-muted">
                          <tr>
                            <th className="p-2">Relationship</th>
                            <th className="p-2">Full name</th>
                            <th className="p-2">ID / Birth cert</th>
                            <th className="p-2">Date of birth</th>
                            <th className="p-2">Status</th>
                            <th className="p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => {
                            const result = summary?.rows[i];
                            return (
                              <tr key={i} className="border-t border-imoth-grey-border/60 align-top">
                                <td className="p-2">
                                  <select
                                    value={row.relationship}
                                    onChange={(e) => updateRow(i, { relationship: e.target.value as RelationshipType })}
                                    className="w-full rounded border border-imoth-grey-border px-1.5 py-1"
                                  >
                                    <option value="">--</option>
                                    {RELATIONSHIPS.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    value={row.fullName}
                                    onChange={(e) => updateRow(i, { fullName: e.target.value })}
                                    className="w-full rounded border border-imoth-grey-border px-1.5 py-1"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    value={row.idNumber}
                                    onChange={(e) => updateRow(i, { idNumber: e.target.value })}
                                    className="w-full rounded border border-imoth-grey-border px-1.5 py-1"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="date"
                                    value={row.dobRaw}
                                    onChange={(e) => updateRow(i, { dobRaw: e.target.value })}
                                    className="w-full rounded border border-imoth-grey-border px-1.5 py-1"
                                  />
                                </td>
                                <td className="p-2">
                                  {result && (
                                    <div>
                                      <span
                                        className={
                                          result.status === "valid"
                                            ? "text-green-700"
                                            : result.status === "duplicate"
                                              ? "text-orange-600"
                                              : "text-imoth-red-dark"
                                        }
                                      >
                                        {result.status}
                                      </span>
                                      {result.reason && <p className="mt-0.5 text-imoth-grey-muted">{result.reason}</p>}
                                      {result.status === "invalid" && !result.parseError && allowOverride && (
                                        <input
                                          placeholder="Override reason"
                                          value={overrideReasons[result.line] ?? ""}
                                          onChange={(e) =>
                                            setOverrideReasons((prev) => ({ ...prev, [result.line]: e.target.value }))
                                          }
                                          className="mt-1 w-full rounded border border-imoth-grey-border px-1.5 py-1"
                                        />
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <button
                                    type="button"
                                    onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))}
                                    className="text-imoth-red-dark hover:underline"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {scheduleUnresolved && (
                    <p className="rounded-lg bg-imoth-red/5 p-3 text-xs font-medium text-imoth-red-dark">
                      Resolve all invalid and duplicate rows (fix, remove, or — where permitted — override with a
                      reason) before this quotation can be generated.
                    </p>
                  )}
                </div>
              )}
            </Section>
          </div>

          <div data-step={4} className={step === 4 ? "" : "hidden"}>
            <Section title="Beneficiaries (optional)">
              {scheduleMode === "schedule" ? (
                familyRowIndices.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs text-imoth-grey-muted">
                      Each family (contributor + their dependants) has its own beneficiary.
                    </p>
                    {familyRowIndices.map((rowIndex, familyNumber) => {
                      const contributorName = rows[rowIndex]?.fullName.trim();
                      const b = familyBeneficiaries[rowIndex] ?? emptyBeneficiary;
                      return (
                        <div key={rowIndex} className="grid grid-cols-3 gap-4 border-t border-imoth-grey-border/60 pt-3 first:border-0 first:pt-0">
                          <p className="col-span-3 text-xs font-semibold text-imoth-navy">
                            Family {familyNumber + 1}
                            {contributorName ? ` — ${contributorName}` : ""}
                          </p>
                          <label className="text-sm font-medium text-imoth-navy">
                            Beneficiary full name
                            <input
                              value={b.fullName}
                              onChange={(e) => updateBeneficiary(rowIndex, { fullName: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="text-sm font-medium text-imoth-navy">
                            Relationship
                            <input
                              value={b.relationship}
                              onChange={(e) => updateBeneficiary(rowIndex, { relationship: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm"
                            />
                          </label>
                          <label className="text-sm font-medium text-imoth-navy">
                            Phone
                            <input
                              value={b.phone}
                              onChange={(e) => updateBeneficiary(rowIndex, { phone: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-imoth-grey-muted">
                    Add PRINCIPAL rows to the member schedule (previous step) to capture a beneficiary for each family.
                  </p>
                )
              ) : (
                <p className="text-sm text-imoth-grey-muted">
                  Beneficiaries are captured per family, which requires named contributors — switch to
                  &quot;Full member schedule&quot; on the previous step to add one.
                </p>
              )}
            </Section>
          </div>

          <div data-step={5} className={step === 5 ? "" : "hidden"}>
            <Section title="Premium">
              <PremiumSummary preview={preview} />
            </Section>
          </div>

          <div data-step={6} className={step === 6 ? "" : "hidden"}>
            <Section title="Review">
              <p className="text-sm text-imoth-grey-muted">
                Confirm the details below, then generate the quotation.
              </p>
              <div className="mt-4">
                <PremiumSummary preview={preview} />
              </div>
            </Section>
          </div>

          <div className="flex justify-between border-t border-imoth-grey-border pt-4">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-lg border border-imoth-grey-border px-5 py-2.5 text-sm font-semibold text-imoth-navy hover:bg-imoth-grey-bg disabled:opacity-40"
            >
              Back
            </button>
            {step < 6 ? (
              <button
                type="button"
                onClick={goNext}
                className="rounded-lg bg-imoth-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-imoth-navy-light"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={scheduleUnresolved}
                className="rounded-lg bg-imoth-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-imoth-red-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                Generate quotation
              </button>
            )}
          </div>
        </form>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-imoth-navy bg-imoth-navy p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Estimated Premium</p>
            <p className="mt-2 text-2xl font-bold">{preview ? formatKES(preview.totalPremium) : "—"}</p>
            {preview && !preview.minGroupSizeMet && (
              <p className="mt-2 rounded-md bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-200">
                Below minimum group size ({preview.minGroupSize}) — subject to underwriter approval
              </p>
            )}
            <p className="mt-3 text-[11px] leading-snug text-white/50">
              Estimate only — final premium is confirmed when the quotation is generated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumSummary({ preview }: { preview: Preview | null }) {
  if (!preview) {
    return <p className="text-sm text-imoth-grey-muted">Select a plan and option to see the estimated premium.</p>;
  }
  return (
    <div className="space-y-2">
      <Row label="Number of contributors" value={String(preview.numContributors)} />
      <Row label="Base premium" value={formatKES(preview.basePremium)} />
      <Row label="Number of extra children" value={String(preview.numAdditionalChildren)} />
      <Row label="Extra-child premium" value={formatKES(preview.additionalChildPremium)} />
      <div className="mt-3 flex items-center justify-between rounded-lg bg-imoth-blue-pale px-4 py-3.5">
        <span className="text-sm font-semibold text-imoth-navy">Total Annual Premium</span>
        <span className="text-xl font-bold text-imoth-navy">{formatKES(preview.totalPremium)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-imoth-grey-border/70 py-1.5 text-sm last:border-0">
      <span className="text-imoth-grey-muted">{label}</span>
      <span className="font-medium text-imoth-navy">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-imoth-grey-border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-imoth-navy">{title}</h2>
      {children}
    </div>
  );
}

function TextField({
  label,
  name,
  required,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm font-medium text-imoth-navy ${className ?? ""}`}>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
      />
    </label>
  );
}

function NumberField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-imoth-navy">
      {label}
      <input
        name={name}
        type="number"
        min={0}
        defaultValue={0}
        required={required}
        className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
      />
    </label>
  );
}
