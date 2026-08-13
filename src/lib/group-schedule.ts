import type { RelationshipType } from "@prisma/client";
import { classifyMembers, type MemberInput, type RateLike } from "@/lib/eligibility";

export const GROUP_SCHEDULE_HEADERS = ["Relationship", "FullName", "IDOrBirthCertificate", "DateOfBirth"] as const;

const VALID_RELATIONSHIPS: RelationshipType[] = ["PRINCIPAL", "SPOUSE", "CHILD", "PARENT", "PARENT_IN_LAW"];

/**
 * Each PRINCIPAL row starts a new contributor "family"; every row after it
 * (until the next PRINCIPAL) is treated as that contributor's dependant.
 * This lets per-family caps (max children/parents) apply correctly across a
 * whole-group upload instead of capping the group as a single family.
 */
export function buildGroupScheduleTemplate(): string {
  const lines = [
    GROUP_SCHEDULE_HEADERS.join(","),
    "PRINCIPAL,Jane Wanjiru,12345678,1985-04-12",
    "SPOUSE,John Wanjiru,23456789,1983-11-02",
    "CHILD,Mary Wanjiru,,2015-06-01",
    "PRINCIPAL,Peter Otieno,34567890,1979-01-20",
    "CHILD,Grace Otieno,,2012-09-15",
  ];
  return lines.join("\r\n");
}

export type ScheduleRow = {
  line: number;
  relationship: RelationshipType | null;
  fullName: string;
  idNumber: string | null;
  dobRaw: string;
  parseError: string | null;
};

function splitCsvLine(line: string): string[] {
  return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

export function parseGroupScheduleCsv(text: string): ScheduleRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  const rows: ScheduleRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [relRaw, fullName, idNumber, dobRaw] = splitCsvLine(lines[i]);
    const relUpper = (relRaw ?? "").toUpperCase() as RelationshipType;
    const relationship = VALID_RELATIONSHIPS.includes(relUpper) ? relUpper : null;
    const dobValid = !!dobRaw && !Number.isNaN(new Date(dobRaw).getTime());
    rows.push({
      line: i + 1,
      relationship,
      fullName: (fullName ?? "").trim(),
      idNumber: (idNumber ?? "").trim() || null,
      dobRaw: (dobRaw ?? "").trim(),
      parseError: !relationship
        ? `Unrecognized relationship "${relRaw ?? ""}" — expected one of ${VALID_RELATIONSHIPS.join(", ")}.`
        : !fullName
          ? "Missing full name."
          : !dobValid
            ? "Missing or invalid date of birth (expected YYYY-MM-DD)."
            : null,
    });
  }
  return rows;
}

export type ScheduleRowResult = ScheduleRow & {
  status: "valid" | "invalid" | "duplicate";
  reason: string | null;
  overridden: boolean;
  benefitAmount: number;
};

export type GroupScheduleSummary = {
  rows: ScheduleRowResult[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  hasUnresolvedErrors: boolean;
  counts: {
    numContributors: number;
    numSpouses: number;
    numChildren: number;
    numAdditionalChildren: number;
    numParents: number;
    numParentsInLaw: number;
  };
};

/**
 * Validates a parsed CSV/manual schedule against the currently active rate:
 * flags parse errors, duplicate members (by ID number, or by name+DOB when
 * no ID is given), and per-family age/cap eligibility (grouped by the
 * PRINCIPAL-starts-a-family convention described above). Only rows that
 * come back eligible (or eligible via override) count toward the premium.
 */
export function evaluateGroupSchedule(
  rate: RateLike,
  rows: ScheduleRow[],
  overrideReasons: Record<number, string>
): GroupScheduleSummary {
  const results = new Map<number, ScheduleRowResult>();
  const seenKeys = new Map<string, number>();

  const clean: ScheduleRow[] = [];
  for (const row of rows) {
    if (row.parseError) {
      results.set(row.line, { ...row, status: "invalid", reason: row.parseError, overridden: false, benefitAmount: 0 });
      continue;
    }
    const key = row.idNumber ? `id:${row.idNumber.toLowerCase()}` : `nd:${row.fullName.toLowerCase()}|${row.dobRaw}`;
    const firstLine = seenKeys.get(key);
    if (firstLine !== undefined) {
      results.set(row.line, {
        ...row,
        status: "duplicate",
        reason: `Duplicate of the member listed on row ${firstLine}.`,
        overridden: false,
        benefitAmount: 0,
      });
      continue;
    }
    seenKeys.set(key, row.line);
    clean.push(row);
  }

  // Group clean rows into per-contributor families: each PRINCIPAL starts a
  // new family; a dependant row before any PRINCIPAL is itself an error.
  const families: ScheduleRow[][] = [];
  for (const row of clean) {
    if (row.relationship === "PRINCIPAL") {
      families.push([row]);
    } else if (families.length === 0) {
      results.set(row.line, {
        ...row,
        status: "invalid",
        reason: "Dependant listed before any contributor (PRINCIPAL) row.",
        overridden: false,
        benefitAmount: 0,
      });
    } else {
      families[families.length - 1].push(row);
    }
  }

  const counts = { numContributors: 0, numSpouses: 0, numChildren: 0, numAdditionalChildren: 0, numParents: 0, numParentsInLaw: 0 };

  for (const family of families) {
    const memberInputs: MemberInput[] = family.map((row) => ({
      relationship: row.relationship!,
      fullName: row.fullName,
      idNumber: row.idNumber,
      dob: new Date(row.dobRaw),
      overrideReason: overrideReasons[row.line] ?? null,
    }));
    const classified = classifyMembers(rate, memberInputs);
    classified.forEach((m, idx) => {
      const row = family[idx];
      results.set(row.line, {
        ...row,
        status: m.eligible ? "valid" : "invalid",
        reason: m.eligible ? (m.overridden ? `Admitted by override: ${m.ineligibilityReason}` : null) : m.ineligibilityReason,
        overridden: m.overridden,
        benefitAmount: m.benefitAmount,
      });
      if (m.eligible) {
        if (m.relationship === "PRINCIPAL") counts.numContributors++;
        else if (m.relationship === "SPOUSE") counts.numSpouses++;
        else if (m.relationship === "CHILD") {
          counts.numChildren++;
          if (m.chargeableExtra) counts.numAdditionalChildren++;
        } else if (m.relationship === "PARENT") counts.numParents++;
        else if (m.relationship === "PARENT_IN_LAW") counts.numParentsInLaw++;
      }
    });
  }

  const orderedRows = rows.map((r) => results.get(r.line)!);
  const validCount = orderedRows.filter((r) => r.status === "valid").length;
  const invalidCount = orderedRows.filter((r) => r.status === "invalid").length;
  const duplicateCount = orderedRows.filter((r) => r.status === "duplicate").length;

  return {
    rows: orderedRows,
    validCount,
    invalidCount,
    duplicateCount,
    hasUnresolvedErrors: invalidCount > 0 || duplicateCount > 0,
    counts,
  };
}
