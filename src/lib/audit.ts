import { Prisma, PrismaClient } from "@prisma/client";

export async function logAudit(
  tx: Prisma.TransactionClient | PrismaClient,
  params: {
    userId: string | null;
    action: string;
    entityType: string;
    entityRef?: string | null;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string | null;
  }
) {
  await tx.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityRef: params.entityRef ?? null,
      oldValue: params.oldValue === undefined ? undefined : (params.oldValue as Prisma.InputJsonValue),
      newValue: params.newValue === undefined ? undefined : (params.newValue as Prisma.InputJsonValue),
      reason: params.reason ?? null,
    },
  });
}
