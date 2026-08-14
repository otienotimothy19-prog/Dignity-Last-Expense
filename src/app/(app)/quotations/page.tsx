import { FilePlus2, Users2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { isAgentScoped } from "@/lib/roles";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { SearchBar, FilterSelect } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  "DRAFT",
  "GENERATED",
  "SENT",
  "ACCEPTED",
  "DECLINED",
  "EXPIRED",
  "CONVERTED_TO_POLICY",
].map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

export default async function QuotationsPage({
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
    ...(isAgentScoped(session!.user.role) ? { createdById: session!.user.id } : {}),
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

  const canCreate = hasPermission(session!.user.role, "quotations.create");

  const [quotations, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { client: true, group: true, plan: true, benefitOption: true, documents: { take: 1 } },
    }),
    prisma.quotation.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Individual/Family and Group Dignity Send-Off Cover quotations."
        action={
          canCreate ? (
            <>
              <LinkButton href="/quotations/new/group" variant="secondary">
                <Users2 className="h-4 w-4" /> New Group
              </LinkButton>
              <LinkButton href="/quotations/new/individual" variant="primary">
                <FilePlus2 className="h-4 w-4" /> New Quotation
              </LinkButton>
            </>
          ) : undefined
        }
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
        {quotations.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No quotations found"
            description="Try adjusting your search or filters, or create a new quotation."
            action={
              canCreate ? (
                <LinkButton href="/quotations/new/individual" variant="primary">
                  <FilePlus2 className="h-4 w-4" /> New Quotation
                </LinkButton>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <THead>
              <Th>Reference</Th>
              <Th>Client / Group</Th>
              <Th>Type</Th>
              <Th>Plan</Th>
              <Th>Option</Th>
              <Th>Premium</Th>
              <Th>Status</Th>
              <Th>Date</Th>
              <Th />
            </THead>
            <TBody>
              {quotations.map((q) => (
                <Tr key={q.id}>
                  <Td>
                    <ReferenceBadge reference={q.referenceCode} href={`/quotations/${q.id}`} size="sm" />
                  </Td>
                  <Td className="font-medium text-imoth-navy">{q.client?.fullName ?? q.group?.name}</Td>
                  <Td>{q.type === "INDIVIDUAL" ? "Individual/Family" : "Group"}</Td>
                  <Td>{q.plan.name}</Td>
                  <Td>{q.benefitOption.name}</Td>
                  <Td className="font-medium">{formatKES(q.totalPremium.toString())}</Td>
                  <Td>
                    <StatusBadge status={q.status} />
                  </Td>
                  <Td className="text-imoth-grey-muted">{formatDateNairobi(q.createdAt)}</Td>
                  <Td className="text-right">
                    <RowActionsMenu
                      items={[
                        { label: "View details", href: `/quotations/${q.id}` },
                        ...(q.documents[0]
                          ? [{ label: "Download PDF", href: `/api/documents/${q.documents[0].id}` }]
                          : []),
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/quotations" searchParams={{ q, status, type }} />
      </TableCard>
    </div>
  );
}
