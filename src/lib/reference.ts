import { Prisma, PrismaClient } from "@prisma/client";

export type DocPrefix = "DIGN-Q" | "DIGN-GQ" | "DIGN-P" | "DIGN-GP";

/**
 * Atomically allocates the next number for (prefix, year) and returns the
 * full reference code, e.g. DIGN-GQ-2026-000001. Uses UPDATE ... RETURNING
 * inside the caller's transaction so concurrent callers serialize on the row
 * lock instead of racing — the sequence can never duplicate or go backwards.
 */
export async function nextReferenceCode(
  tx: Prisma.TransactionClient | PrismaClient,
  prefix: DocPrefix,
  year: number = new Date().getFullYear()
): Promise<string> {
  await tx.documentSequence.upsert({
    where: { prefix_year: { prefix, year } },
    create: { prefix, year, lastNumber: 0 },
    update: {},
  });

  const updated = await tx.$queryRaw<{ last_number: number }[]>`
    UPDATE document_sequences
    SET last_number = last_number + 1, updated_at = now()
    WHERE prefix = ${prefix} AND year = ${year}
    RETURNING last_number
  `;

  const num = updated[0].last_number;
  const padded = String(num).padStart(6, "0");
  return `${prefix}-${year}-${padded}`;
}

export function versionedReference(baseReference: string, versionNumber: number): string {
  if (versionNumber <= 1) return baseReference;
  return `${baseReference}-R${versionNumber - 1}`;
}
