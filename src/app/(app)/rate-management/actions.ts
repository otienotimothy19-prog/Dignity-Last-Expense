"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { RATE_FIELD_DEFS, type RateFieldKey } from "@/lib/rate-fields";

function num(formData: FormData, key: string): number {
  return Number(formData.get(key));
}

function rateFieldsFromForm(formData: FormData) {
  return {
    versionLabel: String(formData.get("versionLabel")),
    principalBenefit: num(formData, "principalBenefit"),
    spouseBenefit: num(formData, "spouseBenefit"),
    childBenefit: num(formData, "childBenefit"),
    parentBenefit: num(formData, "parentBenefit"),
    parentInLawBenefit: num(formData, "parentInLawBenefit"),
    maxChildren: num(formData, "maxChildren"),
    maxParents: num(formData, "maxParents"),
    maxParentsInLaw: num(formData, "maxParentsInLaw"),
    annualRate: num(formData, "annualRate"),
    additionalChildRate: num(formData, "additionalChildRate"),
    minGroupSize: num(formData, "minGroupSize"),
    minAge: num(formData, "minAge"),
    maxAge: num(formData, "maxAge"),
    minChildAgeMonths: num(formData, "minChildAgeMonths"),
    maxChildAgeYears: num(formData, "maxChildAgeYears"),
    minParentAge: num(formData, "minParentAge"),
    maxParentAge: num(formData, "maxParentAge"),
    waitingPeriodDays: num(formData, "waitingPeriodDays"),
    accidentWaitingPeriodDays: num(formData, "accidentWaitingPeriodDays"),
    gracePeriodDays: num(formData, "gracePeriodDays"),
    maxClaimsPerYear: num(formData, "maxClaimsPerYear"),
    maxLifetimeBenefit: num(formData, "maxLifetimeBenefit"),
    claimsSettlementHours: num(formData, "claimsSettlementHours"),
    policyDurationMonths: num(formData, "policyDurationMonths"),
    paymentFrequency: String(formData.get("paymentFrequency") ?? "ANNUAL"),
    claimsLimitNotes: String(formData.get("claimsLimitNotes") ?? ""),
    requiresApprovalBelowMin: formData.get("requiresApprovalBelowMin") === "on",
    effectiveFrom: new Date(String(formData.get("effectiveFrom"))),
  };
}

type RateFieldSource = Record<RateFieldKey, unknown> & { paymentFrequency: string };

function diffRateVersions(oldV: RateFieldSource | null, newFields: RateFieldSource) {
  const changes: { field: string; label: string; oldValue: string | null; newValue: string }[] = [];
  for (const def of RATE_FIELD_DEFS) {
    const oldValue = oldV ? String(oldV[def.key]) : null;
    const newValue = String(newFields[def.key]);
    if (oldValue !== newValue) {
      changes.push({ field: def.key, label: def.label, oldValue, newValue });
    }
  }
  if (!oldV || oldV.paymentFrequency !== newFields.paymentFrequency) {
    changes.push({
      field: "paymentFrequency",
      label: "Payment frequency",
      oldValue: oldV?.paymentFrequency ?? null,
      newValue: newFields.paymentFrequency,
    });
  }
  return changes;
}

export async function createDraftRateVersion(benefitOptionId: string, cloneFromId: string | null, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.create")) {
    throw new Error("Not authorized to create rate versions.");
  }

  const fields = rateFieldsFromForm(formData);

  const created = await prisma.rateVersion.create({
    data: {
      benefitOptionId,
      status: "DRAFT",
      createdById: session.user.id,
      clonedFromId: cloneFromId,
      ...fields,
    },
  });

  await logAudit(prisma, {
    userId: session.user.id,
    action: "RATE_DRAFT_CREATED",
    entityType: "RateVersion",
    entityRef: created.id,
    newValue: fields,
    reason: cloneFromId ? `Cloned from version ${cloneFromId}` : null,
  });

  redirect(`/rate-management/${benefitOptionId}/versions/${created.id}`);
}

export async function activateRateVersion(benefitOptionId: string, versionId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.activate")) {
    throw new Error("Not authorized to activate rate versions.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("A reason for this rate change is required.");
  }

  await prisma.$transaction(async (tx) => {
    const version = await tx.rateVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { benefitOption: { include: { plan: true } } },
    });

    if (version.status !== "DRAFT" && version.status !== "SCHEDULED") {
      throw new Error(`Cannot activate a version with status ${version.status}.`);
    }

    const current = await tx.rateVersion.findFirst({
      where: { benefitOptionId, status: "ACTIVE" },
    });

    if (current && version.effectiveFrom < current.effectiveFrom) {
      throw new Error(
        "New effective date must not be before the current active version's effective date — this would create an overlapping effective period."
      );
    }

    const now = new Date();
    const goesLiveNow = version.effectiveFrom <= now;

    if (goesLiveNow) {
      await tx.rateVersion.update({
        where: { id: versionId },
        data: { status: "ACTIVE", activatedAt: now, activatedById: session.user.id },
      });
      if (current) {
        await tx.rateVersion.update({
          where: { id: current.id },
          data: { status: "EXPIRED", effectiveTo: version.effectiveFrom },
        });
      }
    } else {
      await tx.rateVersion.update({
        where: { id: versionId },
        data: { status: "SCHEDULED" },
      });
    }

    const changes = diffRateVersions(current, version);

    await logAudit(tx, {
      userId: session.user.id,
      action: goesLiveNow ? "RATE_ACTIVATED" : "RATE_SCHEDULED",
      entityType: "RateVersion",
      entityRef: versionId,
      oldValue: current
        ? { tier: version.benefitOption.plan.name, grade: version.benefitOption.name, changes }
        : { tier: version.benefitOption.plan.name, grade: version.benefitOption.name, changes: [] },
      newValue: { tier: version.benefitOption.plan.name, grade: version.benefitOption.name, changes },
      reason,
    });
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
  redirect(`/rate-management/${benefitOptionId}/versions/${versionId}`);
}

export async function deactivateRateVersion(benefitOptionId: string, versionId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.deactivate")) {
    throw new Error("Not authorized to deactivate rate versions.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    throw new Error("A reason for deactivating this rate version is required.");
  }

  await prisma.$transaction(async (tx) => {
    const version = await tx.rateVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: { benefitOption: { include: { plan: true } } },
    });

    if (version.status !== "ACTIVE" && version.status !== "SCHEDULED") {
      throw new Error(`Cannot deactivate a version with status ${version.status}.`);
    }

    await tx.rateVersion.update({
      where: { id: versionId },
      data: { status: "INACTIVE", effectiveTo: new Date() },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "RATE_DEACTIVATED",
      entityType: "RateVersion",
      entityRef: versionId,
      oldValue: { tier: version.benefitOption.plan.name, grade: version.benefitOption.name, status: version.status },
      newValue: { status: "INACTIVE" },
      reason,
    });
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
  redirect(`/rate-management/${benefitOptionId}/versions/${versionId}`);
}

export type InlineRateEditState = { error: string | null; success: boolean };

/**
 * The inline-table "Save" action: creates the new version AND activates (or
 * schedules) it in one step, since the Confirm Rate Change modal in front of
 * this already IS the review/confirmation moment. Never mutates the current
 * active row — it is expired, not overwritten.
 *
 * Returns a result object instead of throwing for expected failure cases
 * (auth, validation, business-rule rejections) so the UI can show a clear
 * inline message rather than crashing to the framework's error boundary.
 * Unexpected errors (DB down, etc.) are still caught and surfaced the same
 * way, with the real message logged server-side for debugging.
 */
export async function applyInlineRateEdit(
  benefitOptionId: string,
  _prevState: InlineRateEditState | undefined,
  formData: FormData
): Promise<InlineRateEditState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.edit")) {
    return { error: "You are not authorized to edit rates.", success: false };
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) {
    return { error: "A reason for this rate change is required.", success: false };
  }

  const effectiveFromRaw = String(formData.get("effectiveFrom") ?? "");
  if (!effectiveFromRaw || Number.isNaN(new Date(effectiveFromRaw).getTime())) {
    return { error: "Effective From must be a valid date.", success: false };
  }

  const fields = rateFieldsFromForm(formData);

  const numericInvalid = RATE_FIELD_DEFS.find((f) => Number.isNaN(Number(fields[f.key])) || Number(fields[f.key]) < 0);
  if (numericInvalid) {
    return { error: `"${numericInvalid.label}" must be a valid, non-negative number.`, success: false };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const benefitOption = await tx.benefitOption.findUniqueOrThrow({
        where: { id: benefitOptionId },
        include: { plan: true },
      });

      const current = await tx.rateVersion.findFirst({
        where: { benefitOptionId, status: "ACTIVE" },
      });

      if (current && fields.effectiveFrom < current.effectiveFrom) {
        throw new Error(
          "Effective date must not be before the current active version's effective date — this would create an overlapping effective period."
        );
      }

      const now = new Date();
      const goesLiveNow = fields.effectiveFrom <= now;

      const created = await tx.rateVersion.create({
        data: {
          benefitOptionId,
          status: goesLiveNow ? "ACTIVE" : "SCHEDULED",
          createdById: session.user.id,
          activatedAt: goesLiveNow ? now : null,
          activatedById: goesLiveNow ? session.user.id : null,
          ...fields,
        },
      });

      if (goesLiveNow && current) {
        await tx.rateVersion.update({
          where: { id: current.id },
          data: { status: "EXPIRED", effectiveTo: fields.effectiveFrom },
        });
      }

      const changes = diffRateVersions(current, fields);

      await logAudit(tx, {
        userId: session.user.id,
        action: goesLiveNow ? "RATE_ACTIVATED" : "RATE_SCHEDULED",
        entityType: "RateVersion",
        entityRef: created.id,
        oldValue: { tier: benefitOption.plan.name, grade: benefitOption.name, changes },
        newValue: { tier: benefitOption.plan.name, grade: benefitOption.name, changes },
        reason,
      });
    });
  } catch (err) {
    console.error("applyInlineRateEdit failed:", err);
    return { error: err instanceof Error ? err.message : "Failed to save the rate change. Please try again.", success: false };
  }

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
  return { error: null, success: true };
}

export async function createBenefitOption(planId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.create")) {
    throw new Error("Not authorized to add options.");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Option/grade name is required.");

  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });

  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.benefitOption.findFirst({
      where: { planId },
      orderBy: { optionNumber: "desc" },
    });
    const nextNumber = (last?.optionNumber ?? 0) + 1;

    const option = await tx.benefitOption.create({
      data: { planId, optionNumber: nextNumber, name },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "OPTION_CREATED",
      entityType: "BenefitOption",
      entityRef: option.id,
      newValue: { tier: plan.name, grade: name },
    });

    return option;
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  redirect(`/rate-management/${created.id}/new`);
}

export async function deactivateBenefitOption(benefitOptionId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.deactivate")) {
    throw new Error("Not authorized to deactivate options.");
  }

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A reason is required.");

  await prisma.$transaction(async (tx) => {
    const option = await tx.benefitOption.findUniqueOrThrow({
      where: { id: benefitOptionId },
      include: { plan: true },
    });

    await tx.benefitOption.update({
      where: { id: benefitOptionId },
      data: { isActive: false },
    });

    // Historical rate versions are never touched — deactivating the option
    // only removes it from selection for new quotations.
    await logAudit(tx, {
      userId: session.user.id,
      action: "OPTION_DEACTIVATED",
      entityType: "BenefitOption",
      entityRef: benefitOptionId,
      oldValue: { tier: option.plan.name, grade: option.name, isActive: true },
      newValue: { isActive: false },
      reason,
    });
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
}

export async function reactivateBenefitOption(benefitOptionId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.edit")) {
    throw new Error("Not authorized to reactivate options.");
  }

  await prisma.$transaction(async (tx) => {
    const option = await tx.benefitOption.findUniqueOrThrow({
      where: { id: benefitOptionId },
      include: { plan: true },
    });

    await tx.benefitOption.update({ where: { id: benefitOptionId }, data: { isActive: true } });

    await logAudit(tx, {
      userId: session.user.id,
      action: "OPTION_REACTIVATED",
      entityType: "BenefitOption",
      entityRef: benefitOptionId,
      oldValue: { tier: option.plan.name, grade: option.name, isActive: false },
      newValue: { isActive: true },
    });
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
}

export async function updatePlanConfig(planId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "rates.edit")) {
    throw new Error("Not authorized to edit plan configuration.");
  }

  const coversSpouse = formData.get("coversSpouse") === "on";
  const coversChildren = formData.get("coversChildren") === "on";
  const coversParents = formData.get("coversParents") === "on";
  const coversParentsInLaw = formData.get("coversParentsInLaw") === "on";

  await prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });

    await tx.plan.update({
      where: { id: planId },
      data: { coversSpouse, coversChildren, coversParents, coversParentsInLaw },
    });

    await logAudit(tx, {
      userId: session.user.id,
      action: "PLAN_CONFIG_UPDATED",
      entityType: "Plan",
      entityRef: planId,
      oldValue: {
        tier: plan.name,
        coversSpouse: plan.coversSpouse,
        coversChildren: plan.coversChildren,
        coversParents: plan.coversParents,
        coversParentsInLaw: plan.coversParentsInLaw,
      },
      newValue: { tier: plan.name, coversSpouse, coversChildren, coversParents, coversParentsInLaw },
    });
  });

  revalidatePath(`/rate-management/individual`);
  revalidatePath(`/rate-management/group`);
  revalidatePath(`/rate-management/rules`);
  revalidatePath(`/rate-management/versions`);
}
