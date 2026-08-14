"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, canOverrideEligibility } from "@/lib/permissions";
import { createIndividualQuotation, type MemberInput, type BeneficiaryInput } from "@/lib/quotation-service";
import type { RelationshipType } from "@prisma/client";

// Individual/Nuclear/Extended Family quotations take exactly one
// beneficiary — the wizard only offers one input set (index 0).
function parseBeneficiaries(formData: FormData): BeneficiaryInput[] {
  const fullName = String(formData.get("beneficiary_name_0") ?? "").trim();
  if (!fullName) return [];
  return [
    {
      fullName,
      relationship: String(formData.get("beneficiary_relationship_0") ?? "").trim() || "Not specified",
      phone: String(formData.get("beneficiary_phone_0") ?? "").trim(),
    },
  ];
}

function rows(
  formData: FormData,
  prefix: string,
  relationship: RelationshipType,
  count: number,
  allowOverride: boolean
): MemberInput[] {
  const out: MemberInput[] = [];
  for (let i = 0; i < count; i++) {
    const name = String(formData.get(`${prefix}_name_${i}`) ?? "").trim();
    const dobRaw = String(formData.get(`${prefix}_dob_${i}`) ?? "").trim();
    if (!name || !dobRaw) continue;
    const overrideReason = String(formData.get(`${prefix}_overrideReason_${i}`) ?? "").trim();
    out.push({
      relationship,
      fullName: name,
      idNumber: String(formData.get(`${prefix}_id_${i}`) ?? "").trim() || null,
      dob: new Date(dobRaw),
      overrideReason: allowOverride && overrideReason ? overrideReason : null,
    });
  }
  return out;
}

export async function createIndividualQuotationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "quotations.create")) {
    throw new Error("Not authorized to create quotations.");
  }

  const benefitOptionId = String(formData.get("benefitOptionId"));
  const benefitOption = await prisma.benefitOption.findUnique({
    where: { id: benefitOptionId },
    include: { plan: true, rateVersions: { where: { status: "ACTIVE" }, take: 1 } },
  });
  const rate = benefitOption?.rateVersions[0];
  if (!benefitOption || !rate) {
    throw new Error("Selected plan/option has no active rate configured.");
  }

  const clientIdNumber = String(formData.get("idNumber") ?? "").trim() || null;
  let client = clientIdNumber
    ? await prisma.client.findFirst({ where: { idNumber: clientIdNumber } })
    : null;

  if (!client) {
    client = await prisma.client.create({
      data: {
        fullName: String(formData.get("fullName")),
        idNumber: clientIdNumber,
        kraPin: String(formData.get("kraPin") ?? "").trim() || null,
        phone: String(formData.get("phone")),
        email: String(formData.get("email") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        agentId: session.user.role === "AGENT" ? session.user.id : null,
      },
    });
  }

  const allowOverride = canOverrideEligibility(session.user.role);
  const principalOverrideReason = String(formData.get("principal_overrideReason_0") ?? "").trim();

  const principal: MemberInput = {
    relationship: "PRINCIPAL",
    fullName: String(formData.get("fullName")),
    idNumber: clientIdNumber,
    dob: new Date(String(formData.get("dob"))),
    overrideReason: allowOverride && principalOverrideReason ? principalOverrideReason : null,
  };

  const members: MemberInput[] = [principal];

  const includeSpouse = formData.get("includeSpouse") === "on";
  if (includeSpouse) {
    members.push(...rows(formData, "spouse", "SPOUSE", 1, allowOverride));
  }
  members.push(...rows(formData, "child", "CHILD", 8, allowOverride));
  members.push(...rows(formData, "parent", "PARENT", 2, allowOverride));
  members.push(...rows(formData, "parentInLaw", "PARENT_IN_LAW", 2, allowOverride));

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const quotation = await prisma.$transaction((tx) =>
    createIndividualQuotation(tx, {
      clientId: client!.id,
      benefitOptionId,
      rate,
      planId: benefitOption.planId,
      members,
      beneficiaries: parseBeneficiaries(formData),
      createdById: session.user.id,
      validUntil,
    })
  );

  redirect(`/quotations/${quotation.id}`);
}
