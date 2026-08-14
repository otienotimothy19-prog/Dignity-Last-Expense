import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  UserRound,
  FileDown,
  CheckCircle2,
  XCircle,
  ShieldPlus,
  MessageSquare,
  History,
  Copy,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmationDialog";
import {
  generatePdfAction,
  transitionStatusAction,
  duplicateQuotationAction,
  convertToPolicyAction,
  deleteQuotationAction,
  addQuotationBeneficiaryAction,
  removeQuotationBeneficiaryAction,
} from "./actions";
import { SendQuotationForm } from "./SendQuotationForm";
import { WhatsAppShare } from "./WhatsAppShare";
import { RecordPaymentForm } from "./RecordPaymentForm";

const RELATIONSHIP_LABEL: Record<string, string> = {
  PRINCIPAL: "Principal",
  SPOUSE: "Spouse",
  CHILD: "Child",
  PARENT: "Parent",
  PARENT_IN_LAW: "Parent-in-law",
};

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, quotation] = await Promise.all([
    auth(),
    prisma.quotation.findUnique({
      where: { id },
      include: {
        client: true,
        group: true,
        plan: true,
        benefitOption: true,
        rateVersion: true,
        members: true,
        documents: { orderBy: { generatedAt: "desc" } },
        createdBy: true,
        policy: true,
        beneficiaries: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    }),
  ]);
  if (!quotation || quotation.deletedAt) notFound();

  const role = session?.user.role ?? "";
  const canGenerate = hasPermission(role, "quotations.generate");
  const canSend = hasPermission(role, "quotations.send");
  const canAccept = hasPermission(role, "quotations.accept");
  const canDecline = hasPermission(role, "quotations.decline");
  const canDuplicate = hasPermission(role, "quotations.create");
  const canConvert = hasPermission(role, "quotations.convert");
  const canDelete = hasPermission(role, "quotations.delete");
  const canRecordPayment = hasPermission(role, "quotations.record_payment");
  const canEditBeneficiaries = hasPermission(role, "quotations.edit");
  const isDeletable = (["DRAFT", "GENERATED", "DECLINED", "EXPIRED"] as string[]).includes(quotation.status);
  const isLockedForEditing = quotation.status === "CONVERTED_TO_POLICY";
  const canAddMoreBeneficiaries = quotation.type !== "INDIVIDUAL" || quotation.beneficiaries.length === 0;
  const recipientEmail = quotation.client?.email ?? quotation.group?.email ?? "";
  const recipientPhone = quotation.client?.phone ?? quotation.group?.phone ?? "";

  const [auditHistory, emailHistory] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityRef: quotation.referenceCode },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
    prisma.emailLog.findMany({
      where: { entityRef: quotation.referenceCode },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const entityName = quotation.client?.fullName ?? quotation.group?.name ?? "—";
  const generatePdf = generatePdfAction.bind(null, quotation.id);
  const acceptAction = transitionStatusAction.bind(null, quotation.id, "ACCEPTED");
  const declineAction = transitionStatusAction.bind(null, quotation.id, "DECLINED");
  const duplicateAction = duplicateQuotationAction.bind(null, quotation.id);
  const convertAction = convertToPolicyAction.bind(null, quotation.id);
  const deleteAction = deleteQuotationAction.bind(null, quotation.id);
  const addBeneficiary = addQuotationBeneficiaryAction.bind(null, quotation.id);

  const categoryRows =
    quotation.type === "GROUP"
      ? [
          { category: "Principal (per contributor)", count: quotation.numContributors, benefit: quotation.rateVersion.principalBenefit },
          { category: "Spouse", count: quotation.numSpouses, benefit: quotation.rateVersion.spouseBenefit },
          { category: "Child", count: quotation.numChildren, benefit: quotation.rateVersion.childBenefit },
          { category: "Parent", count: quotation.numParents, benefit: quotation.rateVersion.parentBenefit },
          { category: "Parent-in-law", count: quotation.numParentsInLaw, benefit: quotation.rateVersion.parentInLawBenefit },
        ].filter((r) => r.count > 0)
      : [];

  return (
    <div className="space-y-6">
      <Link href="/quotations" className="inline-flex items-center gap-1.5 text-sm font-medium text-imoth-grey-muted hover:text-imoth-navy">
        <ArrowLeft className="h-4 w-4" /> Back to quotations
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <ReferenceBadge reference={quotation.referenceCode} withCopy size="lg" />
          <h1 className="mt-1 text-xl font-bold text-imoth-navy">{entityName}</h1>
          <p className="mt-0.5 text-sm text-imoth-grey-muted">
            {quotation.plan.name} — {quotation.benefitOption.name} · {quotation.type === "INDIVIDUAL" ? "Individual/Family" : "Group"}
          </p>
        </div>
        <StatusBadge status={quotation.status} />
      </div>

      {!quotation.minGroupSizeMet && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-800">
          Membership ({quotation.numContributors}) is below the minimum group size ({quotation.rateVersion.minGroupSize}) for this
          option — SUBJECT TO UNDERWRITER APPROVAL / WAIVER.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title={quotation.type === "INDIVIDUAL" ? "Client" : "Group"} icon={quotation.type === "INDIVIDUAL" ? UserRound : Building2}>
            <DL>
              <DLRow label="Name" value={entityName} />
              {quotation.group?.contactPerson && <DLRow label="Contact person" value={quotation.group.contactPerson} />}
              <DLRow label="Phone" value={quotation.client?.phone ?? quotation.group?.phone ?? "—"} />
              <DLRow label="Email" value={quotation.client?.email ?? quotation.group?.email ?? "—"} />
              {quotation.client?.idNumber && <DLRow label="ID / Passport" value={quotation.client.idNumber} />}
              {(quotation.client?.kraPin ?? quotation.group?.kraPin) && (
                <DLRow label="KRA PIN" value={quotation.client?.kraPin ?? quotation.group?.kraPin ?? "—"} />
              )}
            </DL>
          </Section>

          <Section title="Cover Details">
            <DL>
              <DLRow label="Plan / Tier" value={quotation.plan.name} />
              <DLRow label="Option / Grade" value={quotation.benefitOption.name} />
              <DLRow label="Number of contributors" value={String(quotation.numContributors)} />
              <DLRow label="Issue date" value={formatDateNairobi(quotation.issueDate)} />
              <DLRow label="Valid until" value={formatDateNairobi(quotation.validUntil)} />
              <DLRow label="Rate effective date" value={formatDateNairobi(quotation.rateEffectiveDate)} />
            </DL>
          </Section>

          <Section title="Benefit Schedule">
            {quotation.members.length > 0 ? (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Name</Th>
                    <Th>Relationship</Th>
                    <Th>Benefit</Th>
                    <Th>Eligibility</Th>
                  </THead>
                  <TBody>
                    {quotation.members.map((m) => (
                      <Tr key={m.id}>
                        <Td className="font-medium text-imoth-navy">{m.fullName}</Td>
                        <Td>{RELATIONSHIP_LABEL[m.relationship]}</Td>
                        <Td>{formatKES(m.benefitAmount.toString())}</Td>
                        <Td>
                          {m.eligible ? (
                            <span className="inline-flex items-center gap-1 text-status-green">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-status-red" title={m.ineligibilityReason ?? ""}>
                              <XCircle className="h-3.5 w-3.5" /> Flagged
                            </span>
                          )}
                        </Td>
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
              <EmptyState title="No members captured" description="This quotation has no named members or category counts." />
            )}
          </Section>

          <Section title="Premium Breakdown">
            <DL>
              <DLRow label="Base premium" value={formatKES(quotation.basePremium.toString())} />
              {quotation.rateVersion.maxChildren > 0 && (
                <DLRow label="Included children" value={String(quotation.rateVersion.maxChildren)} />
              )}
              <DLRow label="Number of extra children" value={String(quotation.numAdditionalChildren)} />
              <DLRow label="Extra child rate" value={formatKES(quotation.rateVersion.additionalChildRate.toString())} />
              <DLRow label="Extra-child premium" value={formatKES(quotation.additionalChildPremium.toString())} />
            </DL>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-imoth-blue-pale px-4 py-3.5">
              <span className="text-sm font-semibold text-imoth-navy">Total Annual Premium</span>
              <span className="text-xl font-bold text-imoth-navy">{formatKES(quotation.totalPremium.toString())}</span>
            </div>
          </Section>

          <Section title="Beneficiaries" icon={Users}>
            {quotation.beneficiaries.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No beneficiaries captured"
                description="Required before this quotation can be converted to a policy."
              />
            ) : (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Name</Th>
                    <Th>Relationship</Th>
                    <Th>Phone</Th>
                    <Th />
                  </THead>
                  <TBody>
                    {quotation.beneficiaries.map((b) => {
                      const removeAction = removeQuotationBeneficiaryAction.bind(null, quotation.id, b.id);
                      return (
                        <Tr key={b.id}>
                          <Td className="font-medium text-imoth-navy">{b.fullName}</Td>
                          <Td>{b.relationship}</Td>
                          <Td>{b.phone}</Td>
                          <Td className="text-right">
                            {canEditBeneficiaries && !isLockedForEditing && (
                              <form action={removeAction}>
                                <button type="submit" className="text-xs font-medium text-imoth-red hover:underline">
                                  Remove
                                </button>
                              </form>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </TableCard>
            )}
            {canEditBeneficiaries && !isLockedForEditing && canAddMoreBeneficiaries && (
              <form action={addBeneficiary} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-imoth-grey-border p-4 sm:grid-cols-4">
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="Full name"
                  className="rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
                />
                <input
                  name="relationship"
                  type="text"
                  required
                  placeholder="Relationship"
                  className="rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
                />
                <input
                  name="phone"
                  type="text"
                  required
                  placeholder="Phone"
                  className="rounded-lg border border-imoth-grey-border px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-imoth-navy px-4 py-2 text-sm font-semibold text-white hover:bg-imoth-navy-light"
                >
                  Add beneficiary
                </button>
              </form>
            )}
          </Section>

          <Section title="Payment History" icon={Wallet}>
            {quotation.payments.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="No payments recorded yet"
                description="Use Record Payment in the panel to log a premium payment."
              />
            ) : (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Amount Paid</Th>
                    <Th>Method</Th>
                    <Th>Transaction Code</Th>
                    <Th>Outstanding</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {quotation.payments.map((p) => (
                      <Tr key={p.id}>
                        <Td className="font-medium text-imoth-navy">{formatKES(p.amountPaid.toString())}</Td>
                        <Td>{p.method}</Td>
                        <Td>{p.mpesaCode ?? "—"}</Td>
                        <Td>{formatKES(p.outstandingBalance.toString())}</Td>
                        <Td className="text-imoth-grey-muted">{formatDateNairobi(p.paymentDate)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </Section>

          <Section title="Documents">
            {quotation.documents.length === 0 ? (
              <EmptyState
                icon={FileDown}
                title="No documents generated yet"
                description="Use Generate PDF in the panel to create the quotation document."
              />
            ) : (
              <ul className="divide-y divide-imoth-grey-border rounded-lg border border-imoth-grey-border bg-white">
                {quotation.documents.map((doc) => (
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

          <Section title="Communication History" icon={MessageSquare}>
            {emailHistory.length === 0 ? (
              <EmptyState title="No send attempts yet" description="Every send attempt — successful or failed — is recorded here." />
            ) : (
              <TableCard>
                <Table>
                  <THead>
                    <Th>Channel</Th>
                    <Th>Recipient</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </THead>
                  <TBody>
                    {emailHistory.map((e) => (
                      <Tr key={e.id}>
                        <Td className="font-medium text-imoth-navy">{e.channel}</Td>
                        <Td>{e.toAddress}</Td>
                        <Td>
                          {e.status === "SENT" ? (
                            <span className="inline-flex items-center gap-1 text-status-green">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sent
                            </span>
                          ) : e.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 text-status-red" title={e.error ?? ""}>
                              <XCircle className="h-3.5 w-3.5" /> Failed
                            </span>
                          ) : (
                            <span className="text-imoth-grey-muted">Queued</span>
                          )}
                        </Td>
                        <Td className="text-imoth-grey-muted">{formatDateNairobi(e.createdAt)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </TableCard>
            )}
          </Section>

          <Section title="Audit History" icon={History}>
            {auditHistory.length === 0 ? (
              <EmptyState title="No audit entries" description="Actions on this quotation will be recorded here." />
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

              {quotation.status === "GENERATED" && canSend && (
                <SendQuotationForm quotationId={quotation.id} defaultEmail={recipientEmail} />
              )}

              {canSend && quotation.documents.length > 0 && (
                <WhatsAppShare
                  quotationId={quotation.id}
                  referenceCode={quotation.referenceCode}
                  entityName={entityName}
                  planLabel={`${quotation.plan.name} — ${quotation.benefitOption.name}`}
                  totalPremium={formatKES(quotation.totalPremium.toString())}
                  defaultPhone={recipientPhone}
                />
              )}

              {quotation.status !== "CONVERTED_TO_POLICY" && canRecordPayment && (
                <RecordPaymentForm quotationId={quotation.id} />
              )}

              {(quotation.status === "GENERATED" || quotation.status === "SENT") && canAccept && (
                <form action={acceptAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-status-green bg-green-50 px-4 py-2.5 text-sm font-semibold text-status-green hover:bg-green-100"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Accept
                  </button>
                </form>
              )}

              {(quotation.status === "GENERATED" || quotation.status === "SENT") && canDecline && (
                <ConfirmSubmitButton
                  action={declineAction}
                  label="Decline"
                  confirmTitle="Decline this quotation?"
                  confirmMessage={`This marks ${quotation.referenceCode} as declined. This cannot be undone from here.`}
                  variant="danger"
                />
              )}

              {canDuplicate && (
                <form action={duplicateAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-imoth-grey-border bg-white px-4 py-2.5 text-sm font-semibold text-imoth-navy hover:bg-imoth-grey-bg"
                  >
                    <Copy className="h-4 w-4" /> Duplicate
                  </button>
                </form>
              )}

              {quotation.status === "ACCEPTED" && canConvert && (
                quotation.beneficiaries.length > 0 ? (
                  <ConfirmSubmitButton
                    action={convertAction}
                    label="Convert to Policy"
                    confirmTitle="Convert this quotation to a policy?"
                    confirmMessage={`This issues a new policy from ${quotation.referenceCode} at its accepted premium and locks this quotation as converted. This cannot be undone from here.`}
                  />
                ) : (
                  <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-800">
                    Add a beneficiary (below) before this quotation can be converted to a policy.
                  </p>
                )
              )}

              {quotation.status === "CONVERTED_TO_POLICY" && quotation.policy && (
                <Link
                  href={`/policies/${quotation.policy.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-imoth-grey-border bg-white px-4 py-2.5 text-sm font-semibold text-imoth-navy hover:bg-imoth-grey-bg"
                >
                  <ShieldPlus className="h-4 w-4" /> View Policy
                </Link>
              )}

              {isDeletable && canDelete && (
                <ConfirmSubmitButton
                  action={deleteAction}
                  label="Delete"
                  confirmTitle="Delete this quotation?"
                  confirmMessage={`This removes ${quotation.referenceCode} from lists, search, and QR verification. The record and its full audit history are kept, not destroyed, but this can't be undone from here.`}
                  variant="danger"
                  requireReason
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-imoth-grey-border bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-imoth-navy">Details</h2>
            <DL>
              <DLRow label="Created by" value={quotation.createdBy.fullName} />
              <DLRow label="Created" value={formatDateNairobi(quotation.createdAt)} />
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
