import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { isAgentScoped } from "@/lib/roles";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar, FilterSelect } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "LAPSED"].map((s) => ({ value: s, label: s }));

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  const session = await auth();
  const { q, status, type, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);

  const validStatus = status && STATUS_OPTIONS.some((o) => o.value === status) ? status : undefined;
  const validType = type === "INDIVIDUAL" || type === "GROUP" ? type : undefined;

  const where = {
    deletedAt: null,
    ...(isAgentScoped(session!.user.role) ? { quotation: { createdById: session!.user.id } } : {}),
    ...(validStatus ? { status: validStatus as never } : {}),
    ...(validType ? { type: validType as never } : {}),
    ...(q
      ? {
          OR: [
            { referenceCode: { contains: q, mode: "insensitive" as const } },
            { client: { fullName: { contains: q, mode: "insensitive" as const } } },
            { group: { name: { contains: q, mode: "insensitive" as const } } },
            { client: { phone: { contains: q, mode: "insensitive" as const } } },
            { group: { phone: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, group: true, plan: true, benefitOption: true, documents: { take: 1 } },
    }),
    prisma.policy.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Issued Dignity Send-Off Cover policies, converted from accepted quotations."
      />

      <form className="flex flex-wrap gap-2">
        <SearchBar name="q" placeholder="Search by reference, name, or phone" defaultValue={q} />
        <FilterSelect name="status" label="All statuses" defaultValue={status} options={STATUS_OPTIONS} />
        <FilterSelect
          name="type"
          label="All types"
          defaultValue={type}
          options={[
            { value: "INDIVIDUAL", label: "Individual/Family" },
            { value: "GROUP", label: "Group" },
          ]}
        />
        <button type="submit" className="rounded-lg border border-imoth-grey-border bg-white px-4 py-2.5 text-sm font-medium text-imoth-navy hover:bg-imoth-grey-bg">
          Apply
        </button>
      </form>

      <TableCard>
        {policies.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No policies found"
            description="Policies appear here once an accepted quotation is converted."
          />
        ) : (
          <Table>
            <THead>
              <Th>Reference</Th>
              <Th>Client / Group</Th>
              <Th>Type</Th>
              <Th>Plan</Th>
              <Th>Option</Th>
              <Th>Premium Paid</Th>
              <Th>Cover Period</Th>
              <Th>Status</Th>
              <Th />
            </THead>
            <TBody>
              {policies.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <ReferenceBadge reference={p.referenceCode} href={`/policies/${p.id}`} size="sm" />
                  </Td>
                  <Td className="font-medium text-imoth-navy">{p.client?.fullName ?? p.group?.name}</Td>
                  <Td>{p.type === "INDIVIDUAL" ? "Individual/Family" : "Group"}</Td>
                  <Td>{p.plan.name}</Td>
                  <Td>{p.benefitOption.name}</Td>
                  <Td className="font-medium">{formatKES(p.premiumPaid.toString())}</Td>
                  <Td className="text-imoth-grey-muted">
                    {formatDateNairobi(p.coverStart)} – {formatDateNairobi(p.coverEnd)}
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="text-right">
                    <RowActionsMenu
                      items={[
                        { label: "View details", href: `/policies/${p.id}` },
                        ...(p.documents[0]
                          ? [{ label: "Download PDF", href: `/api/documents/${p.documents[0].id}` }]
                          : []),
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/policies" searchParams={{ q, status, type }} />
      </TableCard>
    </div>
  );
}
