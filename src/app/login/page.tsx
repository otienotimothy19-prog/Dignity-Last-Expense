import { CheckCircle2, ShieldCheck } from "lucide-react";
import { ImothLogo, ImothMark } from "@/components/ImothLogo";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 flex-col justify-between bg-imoth-navy p-12 text-white lg:flex">
        <ImothLogo variant="full" size="lg" onDark />
        <div>
          <ShieldCheck className="mb-4 h-10 w-10 text-imoth-red" />
          <h2 className="max-w-md text-3xl font-bold leading-tight">
            Dignity Last Expense Management System
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            Quotations, policies, and premiums for Individual, Family, and Group Dignity
            Send-Off Cover — managed in one place.
          </p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} Imoth Insurance Brokers Ltd</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-imoth-grey-bg px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <div className="mb-4 flex justify-center">
              <ImothMark size="lg" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-imoth-red">
              Imoth Insurance Brokers Ltd
            </p>
          </div>

          <div className="rounded-xl border border-imoth-grey-border bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-imoth-navy">Sign in</h1>
              <p className="mt-1 text-sm text-imoth-grey-muted">Dignity Last Expense Quotation &amp; Policy System</p>
            </div>
            {reset === "success" && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-status-green">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Password updated — sign in with your new password.
              </div>
            )}
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
