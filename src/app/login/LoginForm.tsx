"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { authenticate } from "./actions";

export function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(authenticate, undefined);
  const [showPassword, setShowPassword] = useState(false);

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
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-imoth-navy">
            Password
          </label>
          <Link href="/forgot-password" className="text-xs font-medium text-imoth-blue hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
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
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
