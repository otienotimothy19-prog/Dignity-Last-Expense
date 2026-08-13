import { FileText } from "lucide-react";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { ReferenceBadge } from "@/components/ui/ReferenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateNairobi } from "@/lib/format";

export type ActivityRow = {
  id: string;
  action: string;
  entityRef: string | null;
  performedBy: string;
  date: Date;
  href?: string;
};

export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  if (rows.length === 0) {
    return (
      <TableCard>
        <EmptyState icon={FileText} title="No activity yet" description="Actions across the system will appear here." />
      </TableCard>
    );
  }

  return (
    <TableCard>
      <Table>
        <THead>
          <Th>Activity</Th>
          <Th>Reference</Th>
          <Th>Performed By</Th>
          <Th>Date</Th>
        </THead>
        <TBody>
          {rows.map((row) => (
            <Tr key={row.id}>
              <Td className="font-medium text-imoth-navy">{row.action}</Td>
              <Td>{row.entityRef ? <ReferenceBadge reference={row.entityRef} href={row.href} /> : "—"}</Td>
              <Td>{row.performedBy}</Td>
              <Td className="text-imoth-grey-muted">{formatDateNairobi(row.date)}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </TableCard>
  );
}
