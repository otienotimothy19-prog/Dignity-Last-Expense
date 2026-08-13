export const ROLE_NAMES = [
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "UNDERWRITER",
  "AGENT",
  "FINANCE",
  "READ_ONLY",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRATOR: "Administrator",
  UNDERWRITER: "Underwriter/Approver",
  AGENT: "Sales/Agent",
  FINANCE: "Finance",
  READ_ONLY: "Read Only",
};

// Roles allowed to create quotations.
export const QUOTATION_CREATE_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "AGENT",
];

// Roles allowed to issue policies from accepted quotations.
export const POLICY_ISSUE_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMINISTRATOR", "UNDERWRITER"];

// Roles allowed to record payments.
export const PAYMENT_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMINISTRATOR", "FINANCE"];

// Roles that only see business assigned to them (agent-scoped).
export const AGENT_SCOPED_ROLES: RoleName[] = ["AGENT"];

export function canCreateQuotation(role: string) {
  return QUOTATION_CREATE_ROLES.includes(role as RoleName);
}

export function canIssuePolicy(role: string) {
  return POLICY_ISSUE_ROLES.includes(role as RoleName);
}

export function canRecordPayment(role: string) {
  return PAYMENT_ROLES.includes(role as RoleName);
}

export function isAgentScoped(role: string) {
  return AGENT_SCOPED_ROLES.includes(role as RoleName);
}
