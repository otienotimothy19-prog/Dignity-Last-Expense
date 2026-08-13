import { Document, Page, Text, View, StyleSheet, Image, Svg, Rect, Path, Circle } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#0f172a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontSize: 8, color: "#0A1F44", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  subtitle: { fontSize: 10, color: "#475569", marginTop: 2 },
  refBox: { alignItems: "flex-end" },
  refCode: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  qr: { width: 64, height: 64, marginTop: 4 },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    backgroundColor: "#f1f5f9",
    padding: 4,
    marginTop: 12,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 150, color: "#475569" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: "row", borderBottom: "1 solid #cbd5e1", paddingBottom: 3, marginBottom: 3 },
  tableRow: { flexDirection: "row", paddingVertical: 2, borderBottom: "0.5 solid #e2e8f0" },
  th: { fontFamily: "Helvetica-Bold", fontSize: 9, color: "#475569" },
  td: { fontSize: 9 },
  colWide: { flex: 2 },
  colMed: { flex: 1 },
  premiumBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#ecfdf5",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  premiumLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#065f46" },
  premiumValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#065f46" },
  notice: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fef3c7",
    color: "#92400e",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  terms: { fontSize: 8, color: "#475569", lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7, color: "#94a3b8" },
});

export type QuotationPdfMember = {
  relationship: string;
  fullName: string;
  dob: string | null;
  benefitAmount: string;
  eligible: boolean;
};

export type QuotationPdfCategoryRow = {
  category: string;
  count: number;
  benefitAmount: string;
};

export type QuotationPdfProps = {
  referenceCode: string;
  issueDate: string;
  validUntil: string;
  entityName: string;
  contactPerson?: string | null;
  phone: string;
  email?: string | null;
  planName: string;
  optionName: string;
  numContributors: number;
  namedMembers?: QuotationPdfMember[];
  categoryRows?: QuotationPdfCategoryRow[];
  basePremium: string;
  includedChildren: number;
  numAdditionalChildren: number;
  additionalChildRate: string;
  additionalChildPremium: string;
  totalPremium: string;
  minGroupSizeMet: boolean;
  requiresApproval: boolean;
  minGroupSize: number;
  waitingPeriodDays: number;
  accidentWaitingPeriodDays: number;
  gracePeriodDays: number;
  maxClaimsPerYear: number;
  maxLifetimeBenefit: string;
  claimsLimitNotes?: string | null;
  qrDataUrl: string;
};

export function QuotationDocument(props: QuotationPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.brandRow}>
              <Svg width={20} height={20} viewBox="0 0 40 40">
                <Rect width={40} height={40} rx={9} fill="#0A1F44" />
                <Path
                  d="M11 27V13L20 21L29 13V27"
                  stroke="white"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Circle cx={31.5} cy={9.5} r={4} fill="#C8102E" />
              </Svg>
              <Text style={styles.brand}>Imoth Insurance Brokers Ltd</Text>
            </View>
            <Text style={styles.title}>Dignity Send-Off Cover — Quotation</Text>
            <Text style={styles.subtitle}>{props.planName} · {props.optionName}</Text>
          </View>
          <View style={styles.refBox}>
            <Text style={styles.refCode}>{props.referenceCode}</Text>
            <Text>Issued: {props.issueDate}</Text>
            <Text>Valid until: {props.validUntil}</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={props.qrDataUrl} style={styles.qr} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Client / Group Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{props.entityName}</Text>
        </View>
        {props.contactPerson && (
          <View style={styles.row}>
            <Text style={styles.label}>Contact person</Text>
            <Text style={styles.value}>{props.contactPerson}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{props.phone}</Text>
        </View>
        {props.email && (
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{props.email}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Number of contributors</Text>
          <Text style={styles.value}>{props.numContributors}</Text>
        </View>

        <Text style={styles.sectionTitle}>Benefit Schedule</Text>
        {props.namedMembers && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colWide]}>Name</Text>
              <Text style={[styles.th, styles.colMed]}>Relationship</Text>
              <Text style={[styles.th, styles.colMed]}>Benefit (KES)</Text>
              <Text style={[styles.th, styles.colMed]}>Eligibility</Text>
            </View>
            {props.namedMembers.map((m, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, styles.colWide]}>{m.fullName}</Text>
                <Text style={[styles.td, styles.colMed]}>{m.relationship}</Text>
                <Text style={[styles.td, styles.colMed]}>{m.benefitAmount}</Text>
                <Text style={[styles.td, styles.colMed]}>{m.eligible ? "Eligible" : "Flagged"}</Text>
              </View>
            ))}
          </View>
        )}
        {props.categoryRows && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colWide]}>Category</Text>
              <Text style={[styles.th, styles.colMed]}>Count</Text>
              <Text style={[styles.th, styles.colMed]}>Benefit per person (KES)</Text>
            </View>
            {props.categoryRows.map((r, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.td, styles.colWide]}>{r.category}</Text>
                <Text style={[styles.td, styles.colMed]}>{r.count}</Text>
                <Text style={[styles.td, styles.colMed]}>{r.benefitAmount}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Premium Calculation</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Base premium</Text>
          <Text style={styles.value}>KES {props.basePremium}</Text>
        </View>
        {props.includedChildren > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Included children</Text>
            <Text style={styles.value}>{props.includedChildren}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>Number of extra children</Text>
          <Text style={styles.value}>{props.numAdditionalChildren}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Extra child rate</Text>
          <Text style={styles.value}>KES {props.additionalChildRate}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Extra-child premium</Text>
          <Text style={styles.value}>KES {props.additionalChildPremium}</Text>
        </View>
        <View style={styles.premiumBox}>
          <Text style={styles.premiumLabel}>Total Annual Premium</Text>
          <Text style={styles.premiumValue}>KES {props.totalPremium}</Text>
        </View>

        {!props.minGroupSizeMet && (
          <Text style={styles.notice}>
            Membership ({props.numContributors}) is below the minimum group size ({props.minGroupSize}) for this
            option. SUBJECT TO UNDERWRITER APPROVAL / WAIVER.
            {props.requiresApproval ? "" : " (Approval not required by current product configuration.)"}
          </Text>
        )}

        <Text style={styles.sectionTitle}>Waiting Periods & Claims</Text>
        <Text style={styles.terms}>
          Natural death waiting period: {props.waitingPeriodDays} days from cover start. Accidental death
          waiting period: {props.accidentWaitingPeriodDays === 0 ? "none (immediate)" : `${props.accidentWaitingPeriodDays} days`}.
          Grace period: {props.gracePeriodDays} calendar days. Maximum {props.maxClaimsPerYear} claims per family
          per year. Maximum lifetime payout of KES {props.maxLifetimeBenefit} per insured person.
          {props.claimsLimitNotes ? ` ${props.claimsLimitNotes}` : ""}
        </Text>

        <Text style={styles.sectionTitle}>Terms & Conditions</Text>
        <Text style={styles.terms}>
          This quotation is issued by Imoth Insurance Brokers Ltd on behalf of the underwriter and is valid until
          the date shown above. Benefits, premiums and eligibility are subject to the terms of the Dignity Send-Off
          Cover policy wording in force at the time of issue. This document does not constitute cover — cover
          begins only on issuance of a policy against an accepted quotation and confirmation of payment. Scan the
          QR code above to verify the authenticity of this document at any time.
        </Text>

        <Text style={styles.footer} fixed>
          Imoth Insurance Brokers Ltd · Dignity Send-Off Cover · Reference {props.referenceCode} · Generated
          document — do not alter.
        </Text>
      </Page>
    </Document>
  );
}
