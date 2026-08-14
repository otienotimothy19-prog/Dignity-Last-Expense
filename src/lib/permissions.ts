import type { RoleName } from "@/lib/roles";

export const RATE_PERMISSIONS = [
  "rates.view",
  "rates.create",
  "rates.edit",
  "rates.activate",
  "rates.deactivate",
  "rates.view_history",
] as const;

export const QUOTATION_PERMISSIONS = [
  "quotations.view",
  "quotations.create",
  "quotations.edit",
  "quotations.generate",
  "quotations.send",
  "quotations.accept",
  "quotations.decline",
  "quotations.convert",
  // Also gates policy deletion — no dedicated policies.* permission
  // dimension exists yet (same reasoning as reusing quotations.generate
  // for policy PDF generation), and both are the same "remove a mistaken
  // or unwanted record" capability restricted to the same trust level.
  "quotations.delete",
] as const;

export type RatePermission = (typeof RATE_PERMISSIONS)[number];
export type QuotationPermission = (typeof QUOTATION_PERMISSIONS)[number];
export type Permission = RatePermission | QuotationPermission;

const ALL_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMINISTRATOR", "UNDERWRITER", "AGENT", "FINANCE", "READ_ONLY"];

const PERMISSION_ROLES: Record<Permission, RoleName[]> = {
  "rates.view": ALL_ROLES,
  "rates.create": ["SUPER_ADMIN", "ADMINISTRATOR"],
  "rates.edit": ["SUPER_ADMIN", "ADMINISTRATOR"],
  "rates.activate": ["SUPER_ADMIN", "ADMINISTRATOR"],
  "rates.deactivate": ["SUPER_ADMIN", "ADMINISTRATOR"],
  "rates.view_history": ALL_ROLES,

  "quotations.view": ALL_ROLES,
  "quotations.create": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT"],
  "quotations.edit": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT"],
  "quotations.generate": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT", "UNDERWRITER", "FINANCE"],
  "quotations.send": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT"],
  "quotations.accept": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT", "UNDERWRITER"],
  "quotations.decline": ["SUPER_ADMIN", "ADMINISTRATOR", "AGENT", "UNDERWRITER"],
  "quotations.convert": ["SUPER_ADMIN", "ADMINISTRATOR", "UNDERWRITER"],
  "quotations.delete": ["SUPER_ADMIN", "ADMINISTRATOR"],
};

// Roles allowed to override a flagged (age/limit-ineligible) member instead
// of the quotation silently accepting them.
export const MEMBER_OVERRIDE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMINISTRATOR", "UNDERWRITER"];

export function hasPermission(role: string, permission: Permission): boolean {
  return PERMISSION_ROLES[permission].includes(role as RoleName);
}

export function canOverrideEligibility(role: string): boolean {
  return MEMBER_OVERRIDE_ROLES.includes(role as RoleName);
}
