"use client";

import { useActionState } from "react";
import { Send, AlertCircle } from "lucide-react";
import { sendPolicyEmailAction } from "./actions";

export function SendPolicyForm({ policyId, defaultEmail }: { policyId: string; defaultEmail: string }) {
  const action = sendPolicyEmailAction.bind(null, policyId);
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-1.5 rounded-lg border border-imoth-grey-border p-3">
      <label className="block text-xs font-medium text-imoth-navy">
        Recipient email
        <input
          name="recipientEmail"
          type="email"
          defaultValue={defaultEmail}
          required
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
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
        <Send className="h-4 w-4" /> {isPending ? "Sending…" : "Send Policy"}
      </button>
    </form>
  );
}
