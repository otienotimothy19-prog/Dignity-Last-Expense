"use client";

import { useActionState } from "react";
import { Wallet, AlertCircle } from "lucide-react";
import { recordQuotationPaymentAction } from "./actions";

export function RecordPaymentForm({ quotationId }: { quotationId: string }) {
  const action = recordQuotationPaymentAction.bind(null, quotationId);
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-1.5 rounded-lg border border-imoth-grey-border p-3">
      <p className="text-xs font-semibold text-imoth-navy">Record Payment</p>
      <label className="block text-xs font-medium text-imoth-navy">
        Amount paid (KES)
        <input
          name="amountPaid"
          type="number"
          min="0"
          step="0.01"
          required
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-xs font-medium text-imoth-navy">
        M-Pesa transaction code
        <input
          name="transactionCode"
          type="text"
          required
          placeholder="e.g. QAB1C2D3E4"
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm uppercase"
        />
      </label>
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-imoth-red-pale px-2 py-1.5 text-xs text-imoth-red">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-imoth-grey-border bg-white px-4 py-2.5 text-sm font-semibold text-imoth-navy hover:bg-imoth-grey-bg disabled:opacity-60"
      >
        <Wallet className="h-4 w-4" /> {isPending ? "Recording…" : "Record Payment"}
      </button>
    </form>
  );
}
