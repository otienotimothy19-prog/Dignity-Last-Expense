"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RatePlanTable } from "./RatePlanTable";
import { EditPlanDetailsButton } from "./EditPlanDetailsModal";
import type { SerializedPlan } from "./types";

const COVERAGE_LABELS: { key: keyof SerializedPlan; label: string }[] = [
  { key: "coversSpouse", label: "Spouse" },
  { key: "coversChildren", label: "Children" },
  { key: "coversParents", label: "Parents" },
  { key: "coversParentsInLaw", label: "Parents-in-law" },
];

export function RatePlanCard({
  plan,
  canEdit,
  canCreate,
  canDeactivate,
  defaultOpen = true,
  defaultAdvancedOpen = false,
  viewMode = "benefits",
}: {
  plan: SerializedPlan;
  canEdit: boolean;
  canCreate: boolean;
  canDeactivate: boolean;
  defaultOpen?: boolean;
  defaultAdvancedOpen?: boolean;
  viewMode?: "benefits" | "rules";
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-imoth-grey-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-imoth-grey-border bg-imoth-grey-bg/60 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 text-left">
          {open ? <ChevronUp className="h-4 w-4 text-imoth-grey-muted" /> : <ChevronDown className="h-4 w-4 text-imoth-grey-muted" />}
          <div>
            <h2 className="text-sm font-semibold text-imoth-navy">{plan.name}</h2>
            <p className="text-xs text-imoth-grey-muted">
              Covers: Principal
              {COVERAGE_LABELS.filter((c) => plan[c.key]).map((c) => `, ${c.label}`).join("")}
            </p>
          </div>
        </button>
        <EditPlanDetailsButton plan={plan} canEdit={canEdit} />
      </div>
      {open && (
        <div className="overflow-x-auto">
          <RatePlanTable
            plan={plan}
            canEdit={canEdit}
            canCreate={canCreate}
            canDeactivate={canDeactivate}
            defaultAdvancedOpen={defaultAdvancedOpen}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}
