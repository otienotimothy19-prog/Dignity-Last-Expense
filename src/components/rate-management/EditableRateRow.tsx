"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp, Pencil, History, Ban, RotateCcw } from "lucide-react";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { RATE_FIELD_DEFS, ADVANCED_RATE_FIELDS, type RateFieldKey } from "@/lib/rate-fields";
import { DEFAULT_RATE_VALUES, type RateValues, type SerializedOption, type SerializedPlan } from "./types";
import { Td, Tr } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  applyInlineRateEdit,
  deactivateBenefitOption,
  reactivateBenefitOption,
  type InlineRateEditState,
} from "@/app/(app)/rate-management/actions";
import { Modal } from "@/components/ui/Modal";
import { VARIANT_CLASS } from "@/components/ui/Button";

const PAYMENT_FREQUENCIES = ["ANNUAL", "SEMI_ANNUAL", "QUARTERLY", "MONTHLY"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function EditableRateRow({
  plan,
  option,
  canEdit,
  canDeactivate,
  defaultAdvancedOpen = false,
  viewMode = "benefits",
}: {
  plan: SerializedPlan;
  option: SerializedOption;
  canEdit: boolean;
  canDeactivate: boolean;
  defaultAdvancedOpen?: boolean;
  viewMode?: "benefits" | "rules";
}) {
  const original: RateValues = option.activeRate ?? DEFAULT_RATE_VALUES;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<RateValues>(original);
  const [advancedOpen, setAdvancedOpen] = useState(defaultAdvancedOpen);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr());
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("");
  const originalRequiresApproval = option.activeRate?.requiresApprovalBelowMin ?? true;
  const [requiresApprovalBelowMin, setRequiresApprovalBelowMin] = useState(originalRequiresApproval);

  const changes = useMemo(
    () => RATE_FIELD_DEFS.filter((f) => Number(values[f.key]) !== Number(original[f.key])),
    [values, original]
  );
  const paymentFrequencyChanged = values.paymentFrequency !== original.paymentFrequency;

  function set<K extends RateFieldKey>(key: K, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function startEdit() {
    setValues(original);
    setEditing(true);
    setAdvancedOpen(defaultAdvancedOpen);
  }
  function cancelEdit() {
    setValues(original);
    setEditing(false);
  }

  const inputClass = (changed: boolean) =>
    `w-24 rounded-md border px-2 py-1 text-sm ${changed ? "border-orange-400 bg-orange-50" : "border-imoth-grey-border"}`;

  const [saveState, formAction, isSaving] = useActionState<InlineRateEditState | undefined, FormData>(
    applyInlineRateEdit.bind(null, option.id),
    undefined
  );

  const [prevSaveState, setPrevSaveState] = useState(saveState);
  if (saveState !== prevSaveState) {
    setPrevSaveState(saveState);
    if (saveState?.success) {
      setConfirmOpen(false);
      setEditing(false);
      setReason("");
    }
  }

  if (!editing) {
    return (
      <Tr className={!option.isActive ? "opacity-50" : ""}>
        <Td className="font-semibold text-imoth-navy">
          {option.name}
          {!option.isActive && <span className="ml-2 text-xs font-normal text-imoth-grey-muted">(inactive)</span>}
        </Td>
        {option.activeRate && viewMode === "benefits" && (
          <>
            <Td>{formatKES(option.activeRate.principalBenefit)}</Td>
            {plan.coversSpouse && <Td>{formatKES(option.activeRate.spouseBenefit)}</Td>}
            {plan.coversChildren && <Td>{formatKES(option.activeRate.childBenefit)}</Td>}
            <Td className="font-semibold text-imoth-navy">{formatKES(option.activeRate.annualRate)}</Td>
            <Td>
              <StatusBadge status={option.activeRate.status} />
            </Td>
            <Td>{formatDateNairobi(option.activeRate.effectiveFrom)}</Td>
          </>
        )}
        {option.activeRate && viewMode === "rules" && (
          <>
            <Td>{option.activeRate.minAge}–{option.activeRate.maxAge} yrs</Td>
            {plan.coversChildren && (
              <Td>{option.activeRate.minChildAgeMonths}mo–{option.activeRate.maxChildAgeYears}yrs</Td>
            )}
            {(plan.coversParents || plan.coversParentsInLaw) && (
              <Td>{option.activeRate.minParentAge}–{option.activeRate.maxParentAge} yrs</Td>
            )}
            <Td>{option.activeRate.waitingPeriodDays}d</Td>
            <Td>{option.activeRate.accidentWaitingPeriodDays === 0 ? "Immediate" : `${option.activeRate.accidentWaitingPeriodDays}d`}</Td>
            <Td>{option.activeRate.gracePeriodDays}d</Td>
            <Td>{option.activeRate.maxClaimsPerYear}</Td>
            <Td>{formatKES(option.activeRate.maxLifetimeBenefit)}</Td>
            <Td>{option.activeRate.claimsSettlementHours}h</Td>
            <Td>{option.activeRate.policyDurationMonths}mo</Td>
            <Td>{option.activeRate.paymentFrequency.replace(/_/g, " ")}</Td>
          </>
        )}
        {!option.activeRate && (
          <Td
            className="text-imoth-grey-muted"
            colSpan={
              viewMode === "benefits"
                ? 4 + (plan.coversSpouse ? 1 : 0) + (plan.coversChildren ? 1 : 0)
                : 8 + (plan.coversChildren ? 1 : 0) + (plan.coversParents || plan.coversParentsInLaw ? 1 : 0)
            }
          >
            No active rate configured
          </Td>
        )}
        <Td className="text-right whitespace-nowrap">
          <div className="flex justify-end gap-3">
            <Link
              href={`/rate-management/${option.id}/versions`}
              className="inline-flex items-center gap-1 text-xs font-medium text-imoth-blue hover:underline"
            >
              <History className="h-3.5 w-3.5" /> History
            </Link>
            {canEdit && option.isActive && (
              <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-xs font-medium text-imoth-blue hover:underline">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canDeactivate && option.isActive && (
              <button
                type="button"
                onClick={() => setDeactivateOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-status-red hover:underline"
              >
                <Ban className="h-3.5 w-3.5" /> Deactivate
              </button>
            )}
            {canDeactivate && !option.isActive && (
              <form action={reactivateBenefitOption.bind(null, option.id)}>
                <button type="submit" className="inline-flex items-center gap-1 text-xs font-medium text-status-green hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                </button>
              </form>
            )}
          </div>
        </Td>

        <Modal open={deactivateOpen} onClose={() => setDeactivateOpen(false)} title={`Deactivate ${option.name}?`}>
          <form
            action={(fd) => {
              deactivateBenefitOption(option.id, fd);
              setDeactivateOpen(false);
            }}
          >
            <p className="text-sm text-imoth-grey-muted">
              This option will no longer be offered for new quotations. Historical rate versions and any
              quotations/policies already using them are never affected.
            </p>
            <label className="mt-4 block text-sm font-medium text-imoth-navy">
              Reason (required)
              <textarea
                name="reason"
                required
                rows={2}
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="mt-1 w-full rounded-md border border-imoth-grey-border px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDeactivateOpen(false)} className={VARIANT_CLASS.secondary}>
                Cancel
              </button>
              <button type="submit" className={VARIANT_CLASS.danger}>
                Deactivate
              </button>
            </div>
          </form>
        </Modal>
      </Tr>
    );
  }

  return (
    <>
      <Tr className="bg-imoth-blue-pale/30">
        <Td className="font-semibold text-imoth-navy align-top">{option.name}</Td>
        <Td
          colSpan={
            viewMode === "benefits"
              ? 5 + (plan.coversSpouse ? 1 : 0) + (plan.coversChildren ? 1 : 0)
              : 9 + (plan.coversChildren ? 1 : 0) + (plan.coversParents || plan.coversParentsInLaw ? 1 : 0)
          }
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Field label="Principal benefit (KES)">
                <input
                  type="number"
                  className={inputClass(values.principalBenefit !== original.principalBenefit)}
                  value={values.principalBenefit}
                  onChange={(e) => set("principalBenefit", Number(e.target.value))}
                />
              </Field>
              {plan.coversSpouse && (
                <Field label="Spouse benefit (KES)">
                  <input
                    type="number"
                    className={inputClass(values.spouseBenefit !== original.spouseBenefit)}
                    value={values.spouseBenefit}
                    onChange={(e) => set("spouseBenefit", Number(e.target.value))}
                  />
                </Field>
              )}
              {plan.coversChildren && (
                <Field label="Child benefit (KES)">
                  <input
                    type="number"
                    className={inputClass(values.childBenefit !== original.childBenefit)}
                    value={values.childBenefit}
                    onChange={(e) => set("childBenefit", Number(e.target.value))}
                  />
                </Field>
              )}
              {plan.coversParents && (
                <Field label="Parent benefit (KES)">
                  <input
                    type="number"
                    className={inputClass(values.parentBenefit !== original.parentBenefit)}
                    value={values.parentBenefit}
                    onChange={(e) => set("parentBenefit", Number(e.target.value))}
                  />
                </Field>
              )}
              {plan.coversParentsInLaw && (
                <Field label="Parent-in-law benefit (KES)">
                  <input
                    type="number"
                    className={inputClass(values.parentInLawBenefit !== original.parentInLawBenefit)}
                    value={values.parentInLawBenefit}
                    onChange={(e) => set("parentInLawBenefit", Number(e.target.value))}
                  />
                </Field>
              )}
              <Field label={plan.isGroup ? "Annual rate / contributor (KES)" : "Annual premium (KES)"}>
                <input
                  type="number"
                  className={inputClass(values.annualRate !== original.annualRate)}
                  value={values.annualRate}
                  onChange={(e) => set("annualRate", Number(e.target.value))}
                />
              </Field>
              {plan.coversChildren && (
                <>
                  <Field label="Included children">
                    <input
                      type="number"
                      className={inputClass(values.maxChildren !== original.maxChildren)}
                      value={values.maxChildren}
                      onChange={(e) => set("maxChildren", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Extra child premium (KES)">
                    <input
                      type="number"
                      className={inputClass(values.additionalChildRate !== original.additionalChildRate)}
                      value={values.additionalChildRate}
                      onChange={(e) => set("additionalChildRate", Number(e.target.value))}
                    />
                  </Field>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-imoth-blue"
            >
              {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Advanced Settings
            </button>

            {advancedOpen && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-white p-4 sm:grid-cols-4">
                {ADVANCED_RATE_FIELDS.filter((f) => {
                  if (f.key === "maxParents") return plan.coversParents;
                  if (f.key === "maxParentsInLaw") return plan.coversParentsInLaw;
                  if (f.key === "minParentAge" || f.key === "maxParentAge") return plan.coversParents || plan.coversParentsInLaw;
                  if (f.key === "minChildAgeMonths" || f.key === "maxChildAgeYears") return plan.coversChildren;
                  return true;
                }).map((f) => (
                  <Field key={f.key} label={f.label}>
                    <input
                      type="number"
                      className={inputClass(Number(values[f.key]) !== Number(original[f.key]))}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, Number(e.target.value))}
                    />
                  </Field>
                ))}
                <Field label="Payment frequency">
                  <select
                    className={`rounded-md border px-2 py-1 text-sm ${paymentFrequencyChanged ? "border-orange-400 bg-orange-50" : "border-imoth-grey-border"}`}
                    value={values.paymentFrequency}
                    onChange={(e) => setValues((prev) => ({ ...prev, paymentFrequency: e.target.value }))}
                  >
                    {PAYMENT_FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className="col-span-2 flex items-center gap-2 text-xs text-imoth-navy sm:col-span-4">
                  <input
                    type="checkbox"
                    checked={requiresApprovalBelowMin}
                    onChange={(e) => setRequiresApprovalBelowMin(e.target.checked)}
                    className="h-4 w-4 rounded border-imoth-grey-border"
                  />
                  Require underwriter approval when membership is below minimum group size
                </label>
                <label className="col-span-2 flex items-center gap-2 text-xs text-imoth-navy sm:col-span-4">
                  Claims notes
                  <textarea
                    value={values.claimsLimitNotes}
                    onChange={(e) => setValues((prev) => ({ ...prev, claimsLimitNotes: e.target.value }))}
                    rows={2}
                    className="w-full rounded-md border border-imoth-grey-border px-2 py-1 text-sm"
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancelEdit} className={VARIANT_CLASS.secondary}>
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={changes.length === 0 && !paymentFrequencyChanged}
                className={VARIANT_CLASS.primary}
              >
                Save
              </button>
            </div>
          </div>
        </Td>
      </Tr>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Rate Change">
        <form action={formAction}>
          {saveState?.error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-imoth-red-pale px-3 py-2.5 text-sm text-imoth-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{saveState.error}</span>
            </div>
          )}
          {changes.length === 0 && !paymentFrequencyChanged ? (
            <p className="text-sm text-imoth-grey-muted">No changes to save.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-imoth-grey-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-imoth-grey-bg text-imoth-grey-muted">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Current</th>
                    <th className="px-3 py-2">New</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-imoth-grey-border">
                  {changes.map((f) => (
                    <tr key={f.key}>
                      <td className="px-3 py-2 text-imoth-grey-muted">{f.label}</td>
                      <td className="px-3 py-2">{f.money ? formatKES(original[f.key]) : original[f.key]}</td>
                      <td className="px-3 py-2 font-semibold text-orange-700">
                        {f.money ? formatKES(values[f.key]) : values[f.key]}
                      </td>
                    </tr>
                  ))}
                  {paymentFrequencyChanged && (
                    <tr>
                      <td className="px-3 py-2 text-imoth-grey-muted">Payment frequency</td>
                      <td className="px-3 py-2">{original.paymentFrequency}</td>
                      <td className="px-3 py-2 font-semibold text-orange-700">{values.paymentFrequency}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <label className="mt-4 block text-sm font-medium text-imoth-navy">
            Effective From
            <input
              type="date"
              name="effectiveFrom"
              required
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-imoth-grey-border px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-imoth-navy">
            Reason for Change (required)
            <textarea
              name="reason"
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-md border border-imoth-grey-border px-3 py-2 text-sm"
              placeholder="e.g. Annual premium revision approved by underwriting"
            />
          </label>

          {/* Full field set — the server action needs every field, not just the changed ones */}
          <input type="hidden" name="versionLabel" value={`${plan.name} ${option.name} — ${effectiveFrom}`} />
          {RATE_FIELD_DEFS.map((f) => (
            <input key={f.key} type="hidden" name={f.key} value={values[f.key]} />
          ))}
          <input type="hidden" name="paymentFrequency" value={values.paymentFrequency} />
          <input type="hidden" name="claimsLimitNotes" value={values.claimsLimitNotes} />
          {requiresApprovalBelowMin && <input type="hidden" name="requiresApprovalBelowMin" value="on" />}

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setConfirmOpen(false)} className={VARIANT_CLASS.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className={VARIANT_CLASS.primary}>
              {isSaving ? "Saving…" : "Confirm & Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-imoth-navy">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
