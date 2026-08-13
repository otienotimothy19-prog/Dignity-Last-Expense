"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "./actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const action = resetPasswordAction.bind(null, token);
  const [errorMessage, formAction, isPending] = useActionState(action, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-imoth-navy">
          New password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 pr-10 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-imoth-grey-muted hover:text-imoth-navy"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-imoth-grey-muted">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-imoth-navy">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-imoth-grey-border px-3 py-2.5 text-sm focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-imoth-red-pale px-3 py-2 text-sm text-imoth-red">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-imoth-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-imoth-red-dark disabled:opacity-60"
      >
        {isPending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
