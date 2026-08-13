import Link from "next/link";
import { History } from "lucide-react";
import { getAllRateVersionHistory } from "@/lib/rates";
import { formatKES, formatDateNairobi } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function RateVersionsPage() {
  const versions = await getAllRateVersionHistory();

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-imoth-grey-muted">
        Full history of every rate version ever created, across Individual/Family and Group.
        Historical versions are never edited or overwritten.
      </p>
      <TableCard>
        {versions.length === 0 ? (
          <EmptyState icon={History} title="No rate versions yet" />
        ) : (
          <Table>
            <THead>
              <Th>Version</Th>
              <Th>Tier</Th>
              <Th>Grade</Th>
              <Th>Annual Premium</Th>
              <Th>Effective From</Th>
              <Th>Effective To</Th>
              <Th>Status</Th>
              <Th />
            </THead>
            <TBody>
              {versions.map((v) => (
                <Tr key={v.id}>
                  <Td className="font-medium text-imoth-navy">{v.versionLabel}</Td>
                  <Td>{v.benefitOption.plan.name}</Td>
                  <Td>{v.benefitOption.name}</Td>
                  <Td>{formatKES(v.annualRate.toString())}</Td>
                  <Td>{formatDateNairobi(v.effectiveFrom)}</Td>
                  <Td>{v.effectiveTo ? formatDateNairobi(v.effectiveTo) : "—"}</Td>
                  <Td>
                    <StatusBadge status={v.status} />
                  </Td>
                  <Td className="text-right">
                    <Link href={`/rate-management/${v.benefitOptionId}/versions/${v.id}`} className="text-xs font-medium text-imoth-blue hover:underline">
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
