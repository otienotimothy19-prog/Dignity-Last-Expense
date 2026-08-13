import { ShieldAlert, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateNairobi } from "@/lib/format";
import { ImothLogo } from "@/components/ImothLogo";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { referenceCode: reference },
    include: { client: true, group: true, plan: true, benefitOption: true },
  });

  const policy = quotation
    ? null
    : await prisma.policy.findUnique({
        where: { referenceCode: reference },
        include: { client: true, group: true, plan: true, benefitOption: true },
      });

  const record = quotation ?? policy;

  return (
    <div className="flex min-h-screen items-center justify-center bg-imoth-grey-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <ImothLogo variant="full" size="md" />
        </div>

        <div className="rounded-xl border border-imoth-grey-border bg-white p-8 shadow-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-imoth-grey-muted">
            Document Verification
          </p>

          {!record ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-lg bg-imoth-red-pale p-6 text-center">
              <ShieldAlert className="h-8 w-8 text-imoth-red" />
              <p className="text-sm text-imoth-red">
                No document found for reference <span className="font-mono">{reference}</span>. This
                reference may be invalid or the document may not exist.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-5 flex flex-col items-center gap-2 rounded-lg bg-green-50 p-4 text-center">
                <ShieldCheck className="h-8 w-8 text-status-green" />
                <p className="text-sm font-semibold text-status-green">Verified document</p>
                <ReferenceBadge reference={record.referenceCode} size="md" />
              </div>
              <dl className="space-y-3 text-sm">
                <Row label="Document type" value={quotation ? "Quotation" : "Policy"} />
                <Row label="Client / Group name" value={record.client?.fullName ?? record.group?.name ?? "—"} />
                <Row label="Plan" value={record.plan.name} />
                <Row label="Benefit option" value={record.benefitOption.name} />
                {quotation && (
                  <>
                    <Row label="Issue date" value={formatDateNairobi(quotation.issueDate)} />
                    <Row label="Status" value={<StatusBadge status={quotation.status} />} />
                    <Row label="Valid until" value={formatDateNairobi(quotation.validUntil)} />
                  </>
                )}
                {policy && (
                  <>
                    <Row label="Issue date" value={formatDateNairobi(policy.issuedAt)} />
                    <Row label="Status" value={<StatusBadge status={policy.status} />} />
                    <Row label="Cover start" value={formatDateNairobi(policy.coverStart)} />
                    <Row label="Cover end" value={formatDateNairobi(policy.coverEnd)} />
                  </>
                )}
              </dl>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-imoth-grey-muted">© {new Date().getFullYear()} Imoth Insurance Brokers Ltd</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-imoth-grey-border/70 pb-2 last:border-0">
      <dt className="text-imoth-grey-muted">{label}</dt>
      <dd className="font-medium text-imoth-navy">{value}</dd>
    </div>
  );
}
