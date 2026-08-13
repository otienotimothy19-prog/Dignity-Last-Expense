"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, canOverrideEligibility } from "@/lib/permissions";
import { createGroupQuotation } from "@/lib/quotation-service";
import { parseGroupScheduleCsv, evaluateGroupSchedule } from "@/lib/group-schedule";
import type { GroupType } from "@prisma/client";

function n(formData: FormData, key: string): number {
  const v = Number(formData.get(key));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export async function createGroupQuotationAction(formData: FormData) {
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

  const registrationNumber = String(formData.get("registrationNumber") ?? "").trim() || null;
  let group = registrationNumber
    ? await prisma.group.findFirst({ where: { registrationNumber } })
    : null;

  if (!group) {
    group = await prisma.group.create({
      data: {
        name: String(formData.get("name")),
        groupType: String(formData.get("groupType")) as GroupType,
        registrationNumber,
        kraPin: String(formData.get("kraPin") ?? "").trim() || null,
        contactPerson: String(formData.get("contactPerson")),
        phone: String(formData.get("phone")),
        email: String(formData.get("email") ?? "").trim() || null,
        address: String(formData.get("address") ?? "").trim() || null,
        agentId: session.user.role === "AGENT" ? session.user.id : null,
      },
    });
  }

  const scheduleMode = String(formData.get("scheduleMode") ?? "summary");
  let counts = {
    numContributors: n(formData, "numContributors"),
    numSpouses: n(formData, "numSpouses"),
    numChildren: n(formData, "numChildren"),
    numAdditionalChildren: n(formData, "numAdditionalChildren"),
    numParents: n(formData, "numParents"),
    numParentsInLaw: n(formData, "numParentsInLaw"),
  };
  let schedule: ReturnType<typeof evaluateGroupSchedule>["rows"] | undefined;

  if (scheduleMode === "schedule") {
    const csvText = String(formData.get("scheduleCsv") ?? "");
    const rows = parseGroupScheduleCsv(csvText);
    if (rows.length === 0) {
      throw new Error("Member schedule is empty. Add at least one contributor row.");
    }

    let overrideReasons: Record<number, string> = {};
    if (canOverrideEligibility(session.user.role)) {
      try {
        overrideReasons = JSON.parse(String(formData.get("overrideReasonsJson") ?? "{}"));
      } catch {
        overrideReasons = {};
      }
    }

    const summary = evaluateGroupSchedule(rate, rows, overrideReasons);
    if (summary.hasUnresolvedErrors) {
      throw new Error(
        `Cannot generate: the member schedule has ${summary.invalidCount} invalid and ${summary.duplicateCount} duplicate row(s) that must be resolved first.`
      );
    }
    schedule = summary.rows;
    counts = summary.counts;
  }

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const quotation = await prisma.$transaction((tx) =>
    createGroupQuotation(tx, {
      groupId: group!.id,
      benefitOptionId,
      rate,
      planId: benefitOption.planId,
      ...counts,
      schedule,
      createdById: session.user.id,
      validUntil,
    })
  );

  redirect(`/quotations/${quotation.id}`);
}
