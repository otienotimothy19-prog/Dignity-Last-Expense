import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImothMark } from "@/components/ImothLogo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-imoth-grey-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <ImothMark size="lg" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-imoth-red">
            Imoth Insurance Brokers Ltd
          </p>
        </div>

        <div className="rounded-xl border border-imoth-grey-border bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-imoth-navy">Forgot password</h1>
            <p className="mt-1 text-sm text-imoth-grey-muted">
              Enter the email on your account and we&apos;ll send you a link to set a new password.
            </p>
          </div>
          <ForgotPasswordForm />
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-imoth-grey-muted hover:text-imoth-navy"
          >
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
