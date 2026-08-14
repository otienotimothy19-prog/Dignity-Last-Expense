"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePolicyPdf } from "@/lib/pdf/generate-policy-pdf";
import { logAudit } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";

// Policy documents reuse the quotations.generate permission — same
// document-generation capability, same set of roles, no dedicated
// policies.* permission dimension exists yet.
export async function generatePolicyPdfAction(policyId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.generate")) {
    throw new Error("Not authorized to generate policy documents.");
  }

  await generatePolicyPdf(policyId, session.user.id);
  revalidatePath(`/policies/${policyId}`);
}

/**
 * Soft-deletes a policy — sets deletedAt so it drops out of lists, search,
 * and QR verification, but the row and everything referencing it (members,
 * documents, payments, the linked quotation) stays intact. Also reuses
 * quotations.delete (see generatePolicyPdfAction above for why there's no
 * separate policies.* permission dimension).
 */
export async function deletePolicyAction(policyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.delete")) {
    throw new Error("Not authorized to delete policies.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("A reason is required to delete a policy.");
  }

  const policy = await prisma.policy.findUniqueOrThrow({ where: { id: policyId } });

  await prisma.$transaction(async (tx) => {
    await tx.policy.update({ where: { id: policyId }, data: { deletedAt: new Date() } });
    await logAudit(tx, {
      userId: session.user.id,
      action: "POLICY_DELETED",
      entityType: "Policy",
      entityRef: policy.referenceCode,
      reason,
    });
  });

  redirect("/policies");
}
