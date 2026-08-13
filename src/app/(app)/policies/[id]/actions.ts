"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generatePolicyPdf } from "@/lib/pdf/generate-policy-pdf";
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
