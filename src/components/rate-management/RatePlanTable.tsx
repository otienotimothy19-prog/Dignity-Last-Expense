"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Table, THead, TBody, Th } from "@/components/ui/Table";
import { EditableRateRow } from "./EditableRateRow";
import { createBenefitOption } from "@/app/(app)/rate-management/actions";
import type { SerializedPlan } from "./types";

export function RatePlanTable({
  plan,
  canEdit,
  canCreate,
  canDeactivate,
  defaultAdvancedOpen = false,
  viewMode = "benefits",
}: {
  plan: SerializedPlan;
  canEdit: boolean;
  canCreate: boolean;
  canDeactivate: boolean;
  defaultAdvancedOpen?: boolean;
  viewMode?: "benefits" | "rules";
}) {
  const [addingOption, setAddingOption] = useState(false);
  const addAction = createBenefitOption.bind(null, plan.id);

  return (
    <div>
      <Table>
        <THead>
          <Th>{plan.isGroup ? "Option" : "Grade"}</Th>
          {viewMode === "benefits" ? (
            <>
              <Th>Principal</Th>
              {plan.coversSpouse && <Th>Spouse</Th>}
              {plan.coversChildren && <Th>Child</Th>}
              <Th>{plan.isGroup ? "Annual Rate / Contributor" : "Annual Premium"}</Th>
              <Th>Status</Th>
              <Th>Effective From</Th>
            </>
          ) : (
            <>
              <Th>Principal Age</Th>
              {plan.coversChildren && <Th>Child Age</Th>}
              {(plan.coversParents || plan.coversParentsInLaw) && <Th>Parent Age</Th>}
              <Th>Natural Wait</Th>
              <Th>Accident Wait</Th>
              <Th>Grace</Th>
              <Th>Max Claims/Yr</Th>
              <Th>Lifetime Payout</Th>
              <Th>Settlement</Th>
              <Th>Duration</Th>
              <Th>Frequency</Th>
            </>
          )}
          <Th />
        </THead>
        <TBody>
          {plan.options.map((option) => (
            <EditableRateRow
              key={option.id}
              plan={plan}
              option={option}
              canEdit={canEdit}
              canDeactivate={canDeactivate}
              defaultAdvancedOpen={defaultAdvancedOpen}
              viewMode={viewMode}
            />
          ))}
        </TBody>
      </Table>

      {canCreate && (
        <div className="border-t border-imoth-grey-border p-3">
          {addingOption ? (
            <form action={addAction} className="flex items-center gap-2">
              <input
                name="name"
                required
                autoFocus
                placeholder={plan.isGroup ? "e.g. Option 7" : "e.g. Platinum"}
                className="rounded-md border border-imoth-grey-border px-3 py-1.5 text-sm"
              />
              <button type="submit" className="rounded-md bg-imoth-red px-3 py-1.5 text-xs font-semibold text-white hover:bg-imoth-red-dark">
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingOption(false)}
                className="rounded-md border border-imoth-grey-border px-3 py-1.5 text-xs font-medium text-imoth-navy hover:bg-imoth-grey-bg"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingOption(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-imoth-blue hover:underline"
            >
              <PlusCircle className="h-4 w-4" /> Add New {plan.isGroup ? "Option" : "Grade"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
