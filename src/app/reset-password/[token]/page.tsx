import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { ImothMark } from "@/components/ImothLogo";
import { findValidPasswordResetToken } from "@/lib/password-reset";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await findValidPasswordResetToken(token);

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
          {!record ? (
            <div>
              <div className="mb-4 flex flex-col items-center gap-2 rounded-lg bg-imoth-red-pale p-6 text-center">
                <ShieldAlert className="h-8 w-8 text-imoth-red" />
                <p className="text-sm text-imoth-red">
                  This reset link is invalid, already used, or has expired.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="block w-full rounded-lg bg-imoth-red px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-imoth-red-dark"
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-imoth-navy">Set a new password</h1>
                <p className="mt-1 text-sm text-imoth-grey-muted">for {record.user.email}</p>
              </div>
              <ResetPasswordForm token={token} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
