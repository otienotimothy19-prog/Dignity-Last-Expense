import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateNairobi } from "@/lib/format";
import { Table, THead, TBody, Tr, Th, Td, TableCard } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";

const RATE_ACTIONS = ["RATE_DRAFT_CREATED", "RATE_ACTIVATED", "RATE_SCHEDULED", "RATE_DEACTIVATED"];

export default async function RateAuditHistoryPage() {
  const logs = await prisma.auditLog.findMany({
    where: { action: { in: RATE_ACTIONS } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="space-y-4 pt-2">
      <p className="text-sm text-imoth-grey-muted">
        Every rate change, in order. This log is immutable and cannot be edited or deleted from
        the admin interface.
      </p>
      <TableCard>
        {logs.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No rate changes recorded yet" />
        ) : (
          <Table>
            <THead>
              <Th>Date/Time</Th>
              <Th>User</Th>
              <Th>Action</Th>
              <Th>Tier / Grade</Th>
              <Th>Change</Th>
              <Th>Reason</Th>
            </THead>
            <TBody>
              {logs.map((log) => {
                type Change = { field: string; label: string; oldValue: string | null; newValue: string };
                type LegacyShape = { tier?: string; grade?: string; annualRate?: string; principalBenefit?: string; changes?: Change[] };
                const oldVal = log.oldValue as LegacyShape | null;
                const newVal = log.newValue as LegacyShape | null;
                const changes: Change[] = newVal?.changes ?? oldVal?.changes ?? [];
                return (
                  <Tr key={log.id} className="align-top">
                    <Td className="whitespace-nowrap text-imoth-grey-muted">{formatDateNairobi(log.createdAt)}</Td>
                    <Td>{log.user?.fullName ?? "System"}</Td>
                    <Td className="font-medium text-imoth-navy">{log.action.replace(/_/g, " ")}</Td>
                    <Td>
                      {newVal?.tier ?? oldVal?.tier ?? "—"} {newVal?.grade ? `/ ${newVal.grade}` : ""}
                    </Td>
                    <Td className="text-xs">
                      {changes.length > 0 ? (
                        changes.map((c) => (
                          <div key={c.field}>
                            {c.label}: {c.oldValue ?? "—"} → {c.newValue}
                          </div>
                        ))
                      ) : (
                        <>
                          {oldVal?.annualRate !== undefined && (
                            <div>Annual: {oldVal.annualRate} → {newVal?.annualRate ?? "—"}</div>
                          )}
                          {oldVal?.principalBenefit !== undefined && (
                            <div>Principal: {oldVal.principalBenefit} → {newVal?.principalBenefit ?? "—"}</div>
                          )}
                        </>
                      )}
                    </Td>
                    <Td className="text-xs">{log.reason ?? "—"}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </TableCard>
    </div>
  );
}
