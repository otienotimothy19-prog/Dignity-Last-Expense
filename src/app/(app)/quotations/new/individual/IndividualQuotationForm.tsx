"use client";

import { useMemo, useRef, useState } from "react";
import type { TierOption } from "@/lib/plan-options";
import { formatKES } from "@/lib/format";
import { calculateAge, calculateAgeInMonths } from "@/lib/premium";
import { Stepper } from "@/components/ui/Stepper";
import { createIndividualQuotationAction } from "./actions";

const STEPS = ["Client", "Cover", "Members", "Beneficiaries", "Premium", "Review"];

type Preview = {
  includeSpouse: boolean;
  numChildren: number;
  numAdditionalChildren: number;
  basePremium: number;
  additionalChildPremium: number;
  totalPremium: number;
};

type Grade = TierOption["grades"][number];

function describeAgeIssue(label: string, age: number, minAge: number, maxAge: number): string | null {
  if (age > maxAge) return `${label} is ${age} years old. Current maximum entry age is ${maxAge}.`;
  if (age < minAge) return `${label} is ${age} years old. Current minimum entry age is ${minAge}.`;
  return null;
}

function ageWarning(relationship: "PRINCIPAL" | "SPOUSE" | "CHILD" | "PARENT" | "PARENT_IN_LAW", dobRaw: string, grade: Grade): string | null {
  if (!dobRaw) return null;
  const dob = new Date(dobRaw);
  if (Number.isNaN(dob.getTime())) return null;
  const age = calculateAge(dob);

  if (relationship === "PRINCIPAL") return describeAgeIssue("Principal", age, grade.minAge, grade.maxAge);
  if (relationship === "SPOUSE") return describeAgeIssue("Spouse", age, grade.minAge, grade.maxAge);
  if (relationship === "PARENT") return describeAgeIssue("Parent", age, grade.minParentAge, grade.maxParentAge);
  if (relationship === "PARENT_IN_LAW") return describeAgeIssue("Parent-in-law", age, grade.minParentAge, grade.maxParentAge);

  // CHILD — evaluated in months
  const months = calculateAgeInMonths(dob);
  if (months > grade.maxChildAgeYears * 12) {
    return `Child is ${age} years old. Current maximum entry age is ${grade.maxChildAgeYears} years.`;
  }
  if (months < grade.minChildAgeMonths) {
    return `Child is ${months} months old. Minimum entry age is ${grade.minChildAgeMonths} months.`;
  }
  return null;
}

export function IndividualQuotationForm({ tiers, allowOverride }: { tiers: TierOption[]; allowOverride: boolean }) {
  const [step, setStep] = useState(1);
  const [planId, setPlanId] = useState(tiers[0]?.planId ?? "");
  const [benefitOptionId, setBenefitOptionId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const selectedTier = tiers.find((t) => t.planId === planId);
  const selectedGrade = selectedTier?.grades.find((g) => g.benefitOptionId === benefitOptionId);

  const capability = useMemo(
    () => ({
      spouse: selectedTier?.coversSpouse ?? false,
      children: selectedTier?.coversChildren ?? false,
      parents: selectedTier?.coversParents ?? false,
      parentsInLaw: selectedTier?.coversParentsInLaw ?? false,
    }),
    [selectedTier]
  );

  function recalcPreview() {
    if (!selectedGrade || !formRef.current) {
      setPreview(null);
      setWarnings({});
      return;
    }
    const fd = new FormData(formRef.current);
    const includeSpouse = fd.get("includeSpouse") === "on" && capability.spouse;
    let numChildren = 0;
    for (let i = 0; i < 8; i++) {
      if (String(fd.get(`child_name_${i}`) ?? "").trim()) numChildren++;
    }
    const maxChildren = selectedGrade.maxChildren;
    const additionalChildRate = Number(selectedGrade.additionalChildRate);
    const numAdditionalChildren = additionalChildRate > 0 ? Math.max(0, numChildren - maxChildren) : 0;
    const basePremium = Number(selectedGrade.annualRate);
    const additionalChildPremium = numAdditionalChildren * additionalChildRate;
    setPreview({
      includeSpouse,
      numChildren,
      numAdditionalChildren,
      basePremium,
      additionalChildPremium,
      totalPremium: basePremium + additionalChildPremium,
    });

    const nextWarnings: Record<string, string> = {};
    const check = (key: string, relationship: Parameters<typeof ageWarning>[0], dobKey: string) => {
      const dobRaw = String(fd.get(dobKey) ?? "").trim();
      const w = ageWarning(relationship, dobRaw, selectedGrade);
      if (w) nextWarnings[key] = w;
    };
    check("principal_0", "PRINCIPAL", "dob");
    if (includeSpouse) check("spouse_0", "SPOUSE", "spouse_dob_0");
    for (let i = 0; i < 8; i++) {
      if (String(fd.get(`child_name_${i}`) ?? "").trim()) check(`child_${i}`, "CHILD", `child_dob_${i}`);
    }
    if (capability.parents) {
      for (let i = 0; i < 2; i++) {
        if (String(fd.get(`parent_name_${i}`) ?? "").trim()) check(`parent_${i}`, "PARENT", `parent_dob_${i}`);
      }
    }
    if (capability.parentsInLaw) {
      for (let i = 0; i < 2; i++) {
        if (String(fd.get(`parentInLaw_name_${i}`) ?? "").trim()) check(`parentInLaw_${i}`, "PARENT_IN_LAW", `parentInLaw_dob_${i}`);
      }
    }
    setWarnings(nextWarnings);
  }

  const goNext = () => {
    // required fields on other (display:none) steps still participate in
    // constraint validation, so scope the check to only this step's fields
    // rather than calling reportValidity() on the whole form.
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
        <h1 className="text-xl font-bold text-imoth-navy">New Individual / Family Quotation</h1>
        <p className="mt-1 text-sm text-imoth-grey-muted">
          Premium is calculated automatically from the active rate table when you generate the quotation.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-imoth-grey-border bg-white p-4 shadow-sm">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          ref={formRef}
          action={createIndividualQuotationAction}
          onChange={recalcPreview}
          className="space-y-6 lg:col-span-2"
        >
          <div data-step={1} className={step === 1 ? "" : "hidden"}>
            <Section title="Client details">
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Full name" name="fullName" required />
                <DateField label="Date of birth" name="dob" required />
                {warnings.principal_0 && (
                  <EligibilityWarning message={warnings.principal_0} overrideName="principal_overrideReason_0" allowOverride={allowOverride} />
                )}
                <TextField label="ID / Passport number" name="idNumber" />
                <TextField label="KRA PIN" name="kraPin" />
                <TextField label="Phone" name="phone" required />
                <TextField label="Email" name="email" type="email" />
                <TextField label="Address / Location" name="address" className="col-span-2" />
              </div>
            </Section>
          </div>

          <div data-step={2} className={step === 2 ? "" : "hidden"}>
            <Section title="Cover — Tier & Grade">
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm font-medium text-imoth-navy">
                  Tier
                  <select
                    value={planId}
                    onChange={(e) => {
                      setPlanId(e.target.value);
                      setBenefitOptionId("");
                    }}
                    className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm"
                  >
                    {tiers.map((t) => (
                      <option key={t.planId} value={t.planId}>
                        {t.planName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium text-imoth-navy">
                  Grade
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
                    {selectedTier?.grades.map((g) => (
                      <option key={g.benefitOptionId} value={g.benefitOptionId}>
                        {g.gradeName} — Annual premium {formatKES(g.annualRate)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedGrade && (
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-imoth-grey-bg p-4 text-sm">
                  <span>Principal benefit: <strong>{formatKES(selectedGrade.principalBenefit)}</strong></span>
                  {capability.spouse && <span>Spouse benefit: <strong>{formatKES(selectedGrade.spouseBenefit)}</strong></span>}
                  {capability.children && (
                    <span>Child benefit: <strong>{formatKES(selectedGrade.childBenefit)}</strong> (up to {selectedGrade.maxChildren} included)</span>
                  )}
                  {capability.parents && <span>Parent benefit: <strong>{formatKES(selectedGrade.parentBenefit)}</strong></span>}
                  {capability.parentsInLaw && <span>Parent-in-law benefit: <strong>{formatKES(selectedGrade.parentInLawBenefit)}</strong></span>}
                  {Number(selectedGrade.additionalChildRate) > 0 && (
                    <span>Extra child premium: <strong>{formatKES(selectedGrade.additionalChildRate)}</strong> per child beyond {selectedGrade.maxChildren}</span>
                  )}
                </div>
              )}
            </Section>
          </div>

          <div data-step={3} className={step === 3 ? "" : "hidden"}>
            {capability.spouse && (
              <Section title="Spouse (optional)">
                <label className="mb-3 flex items-center gap-2 text-sm text-imoth-navy">
                  <input type="checkbox" name="includeSpouse" className="h-4 w-4 rounded border-imoth-grey-border" />
                  Include spouse
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Spouse full name" name="spouse_name_0" />
                  <DateField label="Spouse date of birth" name="spouse_dob_0" />
                  {warnings.spouse_0 && (
                    <EligibilityWarning message={warnings.spouse_0} overrideName="spouse_overrideReason_0" allowOverride={allowOverride} />
                  )}
                </div>
              </Section>
            )}

            {capability.children && (
              <Section title={`Children (up to ${selectedTier?.grades[0]?.maxChildren ?? 4} included; leave blank rows unused)`}>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="col-span-2 grid grid-cols-2 gap-4 border-t border-imoth-grey-border/60 pt-3 first:border-0 first:pt-0">
                      <TextField label={`Child ${i + 1} name`} name={`child_name_${i}`} />
                      <DateField label={`Child ${i + 1} date of birth`} name={`child_dob_${i}`} />
                      {warnings[`child_${i}`] && (
                        <EligibilityWarning message={warnings[`child_${i}`]} overrideName={`child_overrideReason_${i}`} allowOverride={allowOverride} />
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {(capability.parents || capability.parentsInLaw) && (
              <Section title="Parents & parents-in-law">
                <div className="grid grid-cols-2 gap-4">
                  {capability.parents &&
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="col-span-2 grid grid-cols-2 gap-4 border-t border-imoth-grey-border/60 pt-3 first:border-0 first:pt-0">
                        <TextField label={`Parent ${i + 1} name`} name={`parent_name_${i}`} />
                        <DateField label={`Parent ${i + 1} date of birth`} name={`parent_dob_${i}`} />
                        {warnings[`parent_${i}`] && (
                          <EligibilityWarning message={warnings[`parent_${i}`]} overrideName={`parent_overrideReason_${i}`} allowOverride={allowOverride} />
                        )}
                      </div>
                    ))}
                  {capability.parentsInLaw &&
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="col-span-2 grid grid-cols-2 gap-4 border-t border-imoth-grey-border/60 pt-3">
                        <TextField label={`Parent-in-law ${i + 1} name`} name={`parentInLaw_name_${i}`} />
                        <DateField label={`Parent-in-law ${i + 1} date of birth`} name={`parentInLaw_dob_${i}`} />
                        {warnings[`parentInLaw_${i}`] && (
                          <EligibilityWarning message={warnings[`parentInLaw_${i}`]} overrideName={`parentInLaw_overrideReason_${i}`} allowOverride={allowOverride} />
                        )}
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {!capability.spouse && !capability.children && !capability.parents && (
              <Section title="Members">
                <p className="text-sm text-imoth-grey-muted">
                  This tier covers the principal only — no additional members to capture.
                </p>
              </Section>
            )}
          </div>

          <div data-step={4} className={step === 4 ? "" : "hidden"}>
            <Section title="Beneficiary (optional)">
              <p className="mb-4 text-xs text-imoth-grey-muted">
                Who receives the payout — can be different from the members covered above. One beneficiary per policy.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <TextField label="Full name" name="beneficiary_name_0" />
                <TextField label="Relationship" name="beneficiary_relationship_0" />
                <TextField label="Phone" name="beneficiary_phone_0" />
              </div>
            </Section>
          </div>

          <div data-step={5} className={step === 5 ? "" : "hidden"}>
            <Section title="Premium">
              <PremiumSummary preview={preview} selectedGrade={selectedGrade} />
            </Section>
          </div>

          <div data-step={6} className={step === 6 ? "" : "hidden"}>
            <Section title="Review">
              <p className="text-sm text-imoth-grey-muted">
                Confirm the details below, then generate the quotation. Client details, tier, grade and
                members from the previous steps are all included in the submission.
              </p>
              <div className="mt-4">
                <PremiumSummary preview={preview} selectedGrade={selectedGrade} />
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
                className="rounded-lg bg-imoth-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-imoth-red-dark"
              >
                Generate quotation
              </button>
            )}
          </div>
        </form>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-imoth-navy bg-imoth-navy p-5 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Estimated Premium</p>
            <p className="mt-2 text-2xl font-bold">
              {preview ? formatKES(preview.totalPremium) : "—"}
            </p>
            {preview && preview.numAdditionalChildren > 0 && (
              <p className="mt-1 text-xs text-white/60">
                Includes {preview.numAdditionalChildren} extra child{preview.numAdditionalChildren > 1 ? "ren" : ""}
              </p>
            )}
            <p className="mt-3 text-[11px] leading-snug text-white/50">
              Estimate only — final eligibility and premium are confirmed when the quotation is generated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PremiumSummary({ preview, selectedGrade }: { preview: Preview | null; selectedGrade: { additionalChildRate: string } | undefined }) {
  if (!preview) {
    return <p className="text-sm text-imoth-grey-muted">Select a tier and grade to see the estimated premium.</p>;
  }
  return (
    <div className="space-y-2">
      <Row label="Base premium" value={formatKES(preview.basePremium)} />
      <Row label="Number of extra children" value={String(preview.numAdditionalChildren)} />
      {selectedGrade && <Row label="Extra child rate" value={formatKES(selectedGrade.additionalChildRate)} />}
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

function EligibilityWarning({ message, overrideName, allowOverride }: { message: string; overrideName: string; allowOverride: boolean }) {
  return (
    <div className="col-span-2 -mt-2 rounded-lg border border-imoth-red/30 bg-imoth-red/5 p-3 text-xs">
      <p className="font-medium text-imoth-red-dark">{message}</p>
      {allowOverride ? (
        <label className="mt-2 block font-medium text-imoth-navy">
          Override reason (required to include this member)
          <input
            name={overrideName}
            type="text"
            className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
            placeholder="Reason for admitting this member outside the standard age range"
          />
        </label>
      ) : (
        <p className="mt-1 text-imoth-grey-muted">
          This member will not be covered and will be excluded from the premium unless an authorized user overrides this.
        </p>
      )}
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

function DateField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-imoth-navy">
      {label}
      <input
        name={name}
        type="date"
        required={required}
        className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
      />
    </label>
  );
}
