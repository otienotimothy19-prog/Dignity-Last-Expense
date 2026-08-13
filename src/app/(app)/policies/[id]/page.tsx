import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, UserRound, FileDown, Wallet, History } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { generatePolicyPdfAction } from "./actions";

const RELATIONSHIP_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  PARENT_IN_LAW: "Parent-in-law",
};

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, policy] = await Promise.all([
    auth(),
    prisma.policy.findUnique({
      where: { id },
      include: {
        client: true,
        group: true,
        plan: true,
        benefitOption: true,
        rateVersion: true,
        members: true,
        documents: { orderBy: { generatedAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        issuedBy: true,
        quotation: true,
      },
    }),
  ]);
  if (!policy) notFound();

  const role = session?.user.role ?? "";
  const canGenerate = hasPermission(role, "quotations.generate");

  const auditHistory = await prisma.auditLog.findMany({
    where: { entityRef: policy.referenceCode },
    orderBy: { createdAt: "desc" },
    include: { user: true },
  });

  const entityName = policy.client?.fullName ?? policy.group?.name ?? "—";
  const generatePdf = generatePolicyPdfAction.bind(null, policy.id);

  const categoryRows =
    policy.members.length === 0
      ? [
          { category: "Principal (per contributor)", count: policy.quotation.numContributors, benefit: policy.rateVersion.principalBenefit },
          { category: "Spouse", count: policy.quotation.numSpouses, benefit: policy.rateVersion.spouseBenefit },
          { category: "Child", count: policy.quotation.numChildren, benefit: policy.rateVersion.childBenefit },
          { category: "Parent", count: policy.quotation.numParents, benefit: policy.rateVersion.parentBenefit },
          { category: "Parent-in-law", count: policy.quotation.numParentsInLaw, benefit: policy.rateVersion.parentInLawBenefit },
        ].filter((r) => r.count > 0)
      : [];

  return (
    <div className="space-y-6">
      <Link href="/policies" className="inline-flex items-center gap-1.5 text-sm font-medium text-imoth-grey-muted hover:text-imoth-navy">
        <ArrowLeft className="h-4 w-4" /> Back to policies
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <ReferenceBadge reference={policy.referenceCode} withCopy size="lg" />
          <h1 className="mt-1 text-xl font-bold text-imoth-navy">{entityName}</h1>
          <p className="mt-0.5 text-sm text-imoth-grey-muted">
            {policy.plan.name} — {policy.benefitOption.name} · {policy.type === "INDIVIDUAL" ? "Individual/Family" : "Group"}
          </p>
        </div>
        <StatusBadge status={policy.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={policy.type === "INDIVIDUAL" ? "Client" : "Group"} icon={policy.type === "INDIVIDUAL" ? UserRound : Building2}>
            <DL>
              <DLRow label="Name" value={entityName} />
              {policy.group?.contactPerson && <DLRow label="Contact person" value={policy.group.contactPerson} />}
              <DLRow label="Phone" value={policy.client?.phone ?? policy.group?.phone ?? "—"} />
              <DLRow label="Email" value={policy.client?.email ?? policy.group?.email ?? "—"} />
              {policy.client?.idNumber && <DLRow label="ID / Passport" value={policy.client.idNumber} />}
              {(policy.client?.kraPin ?? policy.group?.kraPin) && (
                <DLRow label="KRA PIN" value={policy.client?.kraPin ?? policy.group?.kraPin ?? "—"} />
              )}
            </DL>
          </Section>

          <Section title="Cover Details">
            <DL>
              <DLRow label="Plan / Tier" value={policy.plan.name} />
              <DLRow label="Option / Grade" value={policy.benefitOption.name} />
              <DLRow label="Number of contributors" value={String(policy.quotation.numContributors)} />
              <DLRow label="Cover start" value={formatDateNairobi(policy.coverStart)} />
              <DLRow label="Cover end" value={formatDateNairobi(policy.coverEnd)} />
              <DLRow label="Issued" value={formatDateNairobi(policy.issuedAt)} />
              <DLRow label="Issued by" value={policy.issuedBy.fullName} />
              <div className="flex justify-between py-2 text-sm">
                <dt className="text-imoth-grey-muted">From quotation</dt>
                <dd>
                  <Link href={`/quotations/${policy.quotationId}`} className="font-medium text-imoth-blue hover:underline">
                    {policy.quotation.referenceCode}
                  </Link>
                </dd>
              </div>
            </DL>
          </Section>

          <Section title="Insured Persons">
            {policy.members.length > 0 ? (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Name</Th>
                    <Th>Relationship</Th>
                    <Th>Benefit</Th>
                  </THead>
                  <TBody>
                    {policy.members.map((m) => (
                      <Tr key={m.id}>
                        <Td className="font-medium text-imoth-navy">{m.fullName}</Td>
                        <Td>{RELATIONSHIP_LABEL[m.relationship]}</Td>
                        <Td>{formatKES(m.benefitAmount.toString())}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            ) : categoryRows.length > 0 ? (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Category</Th>
                    <Th>Count</Th>
                    <Th>Benefit per person</Th>
                  </THead>
                  <TBody>
                    {categoryRows.map((r) => (
                      <Tr key={r.category}>
                        <Td className="font-medium text-imoth-navy">{r.category}</Td>
                        <Td>{r.count}</Td>
                        <Td>{formatKES(r.benefit.toString())}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            ) : (
              <EmptyState title="No insured persons recorded" description="This policy has no named members or category counts." />
            )}
          </Section>

          <Section title="Premium">
            <div className="flex items-center justify-between rounded-lg bg-imoth-blue-pale px-4 py-3.5">
              <span className="text-sm font-semibold text-imoth-navy">Total Annual Premium Paid</span>
              <span className="text-xl font-bold text-imoth-navy">{formatKES(policy.premiumPaid.toString())}</span>
            </div>
          </Section>

          <Section title="Documents">
            {policy.documents.length === 0 ? (
              <EmptyState
                icon={FileDown}
                title="No documents generated yet"
                description="Use Generate PDF in the panel to create the policy certificate."
              />
            ) : (
              <ul className="divide-y divide-imoth-grey-border rounded-lg border border-imoth-grey-border bg-white">
                {policy.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <ReferenceBadge reference={doc.referenceCode} size="sm" />
                    <div className="flex items-center gap-4">
                      <span className="text-imoth-grey-muted">{formatDateNairobi(doc.generatedAt)}</span>
                      <a href={`/api/documents/${doc.id}`} target="_blank" className="font-medium text-imoth-blue hover:underline">
                        Download
                      </a>
                      <Link href={`/verify/${doc.referenceCode}`} target="_blank" className="text-imoth-grey-muted hover:underline">
                        Verify
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Payment History" icon={Wallet}>
            {policy.payments.length === 0 ? (
              <EmptyState title="No payments recorded yet" description="Payment recording is not wired up yet — premium paid above is recorded from the accepted quotation." />
            ) : (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Amount</Th>
                    <Th>Method</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {policy.payments.map((p) => (
                      <Tr key={p.id}>
                        <Td className="font-medium text-imoth-navy">{formatKES(p.amountPaid.toString())}</Td>
                        <Td>{p.method}</Td>
                        <Td className="text-imoth-grey-muted">{formatDateNairobi(p.paymentDate)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </Section>

          <Section title="Audit History" icon={History}>
            {auditHistory.length === 0 ? (
              <EmptyState title="No audit entries" description="Actions on this policy will be recorded here." />
            ) : (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Action</Th>
                    <Th>User</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {auditHistory.map((a) => (
                      <Tr key={a.id}>
                        <Td className="font-medium text-imoth-navy">{a.action.replace(/_/g, " ")}</Td>
                        <Td>{a.user?.fullName ?? "System"}</Td>
                        <Td className="text-imoth-grey-muted">{formatDateNairobi(a.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-imoth-grey-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-imoth-navy">Actions</h2>
            <div className="space-y-2.5">
              {canGenerate && (
                <form action={generatePdf}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-imoth-red px-4 py-2.5 text-sm font-semibold text-white hover:bg-imoth-red-dark"
                  >
                    <FileDown className="h-4 w-4" /> Generate PDF
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-imoth-grey-border bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-imoth-navy">Details</h2>
            <DL>
              <DLRow label="Issued by" value={policy.issuedBy.fullName} />
              <DLRow label="Issued" value={formatDateNairobi(policy.issuedAt)} />
            </DL>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-imoth-navy">
        {Icon && <Icon className="h-4 w-4 text-imoth-grey-muted" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function DL({ children }: { children: React.ReactNode }) {
  return <dl className="rounded-xl border border-imoth-grey-border bg-white p-5 shadow-sm">{children}</dl>;
}

function DLRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-imoth-grey-border/70 py-2 text-sm last:border-0">
      <dt className="text-imoth-grey-muted">{label}</dt>
      <dd className="font-medium text-imoth-navy">{value}</dd>
    </div>
  );
}
