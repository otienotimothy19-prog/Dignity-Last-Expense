"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { VARIANT_CLASS } from "@/components/ui/Button";
import { updatePlanConfig } from "@/app/(app)/rate-management/actions";
import type { SerializedPlan } from "./types";

export function EditPlanDetailsButton({ plan, canEdit }: { plan: SerializedPlan; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;

  const action = updatePlanConfig.bind(null, plan.id);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-imoth-grey-border px-3 py-1.5 text-xs font-medium text-imoth-navy hover:bg-imoth-grey-bg"
      >
        <Settings2 className="h-3.5 w-3.5" /> Edit Plan Details
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${plan.name}`}>
        <form
          action={(fd) => {
            action(fd);
            setOpen(false);
          }}
        >
          <p className="mb-3 text-sm text-imoth-grey-muted">
            Choose which dependant types {plan.name} covers. Turning a type off hides it in the quotation
            wizard; existing rate benefits for that type should be set to 0 to match.
          </p>
          <div className="space-y-2">
            <CoverageCheckbox name="coversSpouse" label="Spouse" defaultChecked={plan.coversSpouse} />
            <CoverageCheckbox name="coversChildren" label="Children" defaultChecked={plan.coversChildren} />
            <CoverageCheckbox name="coversParents" label="Parents" defaultChecked={plan.coversParents} />
            <CoverageCheckbox name="coversParentsInLaw" label="Parents-in-law" defaultChecked={plan.coversParentsInLaw} />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className={VARIANT_CLASS.secondary}>
              Cancel
            </button>
            <button type="submit" className={VARIANT_CLASS.primary}>
              Save
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function CoverageCheckbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-imoth-grey-border px-3 py-2 text-sm text-imoth-navy">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-imoth-grey-border" />
      {label}
    </label>
  );
}
