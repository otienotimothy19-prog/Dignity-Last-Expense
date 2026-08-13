"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "./actions";

export function ForgotPasswordForm() {
  const [message, formAction, isPending] = useActionState(requestPasswordResetAction, undefined);

  if (message) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-status-green">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-imoth-navy">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-imoth-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-imoth-red-dark disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
