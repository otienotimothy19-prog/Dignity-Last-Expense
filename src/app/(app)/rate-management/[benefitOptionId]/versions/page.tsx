import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRateVersionHistory } from "@/lib/rates";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { History } from "lucide-react";

export default async function OptionVersionHistoryPage({
  params,
}: {
  params: Promise<{ benefitOptionId: string }>;
}) {
  const { benefitOptionId } = await params;

  const benefitOption = await prisma.benefitOption.findUnique({
    where: { id: benefitOptionId },
    include: { plan: true },
  });
  if (!benefitOption) notFound();

  const versions = await getRateVersionHistory(benefitOptionId);
  const userIds = [...new Set(versions.map((v) => v.activatedById ?? v.createdById).filter((id): id is string => !!id))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.fullName]));

  return (
    <div className="max-w-3xl space-y-4 pt-4">
      <div>
        <p className="text-xs text-imoth-grey-muted">{benefitOption.plan.name}</p>
        <h1 className="text-lg font-bold text-imoth-navy">{benefitOption.name} — Version History</h1>
      </div>

      <TableCard>
        {versions.length === 0 ? (
          <EmptyState icon={History} title="No rate versions yet" />
        ) : (
          <Table>
            <THead>
              <Th>Version</Th>
              <Th>Rate</Th>
              <Th>Effective From</Th>
              <Th>Effective To</Th>
              <Th>Status</Th>
              <Th>Changed By</Th>
              <Th />
            </THead>
            <TBody>
              {versions.map((v) => (
                <Tr key={v.id}>
                  <Td className="font-medium text-imoth-navy">{v.versionLabel}</Td>
                  <Td>{formatKES(v.annualRate.toString())}</Td>
                  <Td>{formatDateNairobi(v.effectiveFrom)}</Td>
                  <Td>{v.effectiveTo ? formatDateNairobi(v.effectiveTo) : "—"}</Td>
                  <Td>
                    <StatusBadge status={v.status} />
                  </Td>
                  <Td>{userMap.get(v.activatedById ?? v.createdById ?? "") ?? "—"}</Td>
                  <Td className="text-right">
                    <Link href={`/rate-management/${benefitOptionId}/versions/${v.id}`} className="text-xs font-medium text-imoth-blue hover:underline">
                      View
                    </Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
}
