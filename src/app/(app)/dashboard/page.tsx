import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  CalendarClock,
  FilePlus2,
  ShieldPlus,
  Building2,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatKES } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { PremiumCard } from "@/components/PremiumCard";
import { ActivityFeed, type ActivityRow } from "@/components/ActivityFeed";
import { LinkButton } from "@/components/ui/Button";

export default async function DashboardPage() {
  const session = await auth();
  const canCreate = hasPermission(session?.user.role ?? "", "quotations.create");

  const sixtyDaysOut = new Date();
  sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);

  const [total, pending, accepted, activePolicies, expiringPolicies, premiumAgg, recentAudit] = await Promise.all([
    prisma.quotation.count({ where: { deletedAt: null } }),
    prisma.quotation.count({ where: { deletedAt: null, status: { in: ["GENERATED", "SENT"] } } }),
    prisma.quotation.count({ where: { deletedAt: null, status: "ACCEPTED" } }),
    prisma.policy.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.policy.count({ where: { deletedAt: null, status: "ACTIVE", coverEnd: { lte: sixtyDaysOut } } }),
    prisma.quotation.aggregate({ where: { deletedAt: null }, _sum: { totalPremium: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: true } }),
  ]);

  const activity: ActivityRow[] = recentAudit.map((a) => ({
    id: a.id,
    action: a.action.replace(/_/g, " "),
    entityRef: a.entityRef,
    performedBy: a.user?.fullName ?? "System",
    date: a.createdAt,
    href: a.entityRef && (a.entityType === "Quotation" || a.entityType === "Document" || a.entityType === "Policy") ? `/verify/${a.entityRef}` : undefined,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Dignity Last Expense — business overview."
        action={
          canCreate ? (
            <LinkButton href="/quotations/new/individual" variant="primary">
              <FilePlus2 className="h-4 w-4" /> New Quotation
            </LinkButton>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total Quotations" value={total} href="/quotations" accent="navy" />
        <StatCard icon={Clock} label="Pending Quotations" value={pending} href="/quotations" accent="orange" />
        <StatCard icon={CheckCircle2} label="Accepted Quotations" value={accepted} href="/quotations" accent="green" />
        <StatCard icon={ShieldCheck} label="Active Policies" value={activePolicies} href="/policies" accent="blue" />
        <StatCard icon={CalendarClock} label="Expiring Policies (60d)" value={expiringPolicies} href="/policies" accent="red" />
        <PremiumCard label="Total Premiums Quoted" value={formatKES(premiumAgg._sum.totalPremium?.toString() ?? "0")} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-imoth-navy">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {canCreate && <QuickAction icon={FilePlus2} label="New Quotation" href="/quotations/new/individual" prominent />}
          <QuickAction icon={ShieldPlus} label="New Policy" comingSoon />
          <QuickAction icon={Building2} label="Add Client / Group" comingSoon />
          <QuickAction icon={Upload} label="Upload Member Schedule" comingSoon />
          <QuickAction icon={SlidersHorizontal} label="Rate Management" href="/rate-management" />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-imoth-navy">Recent Activity</h2>
          <Link href="/quotations" className="text-sm font-medium text-imoth-blue hover:underline">
            View all quotations →
          </Link>
        </div>
        <ActivityFeed rows={activity} />
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  prominent,
  comingSoon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  prominent?: boolean;
  comingSoon?: boolean;
}) {
  const content = (
    <div
      className={`flex h-full flex-col items-start gap-3 rounded-xl border p-4 transition-shadow ${
        prominent
          ? "border-imoth-red bg-imoth-red text-white shadow-sm hover:shadow-md"
          : comingSoon
            ? "border-imoth-grey-border bg-white text-imoth-grey-muted"
            : "border-imoth-grey-border bg-white text-imoth-navy shadow-sm hover:shadow-md"
      }`}
    >
      <Icon className={`h-5 w-5 ${prominent ? "text-white" : comingSoon ? "text-imoth-grey-muted" : "text-imoth-blue"}`} />
      <span className="text-sm font-semibold">{label}</span>
      {comingSoon && (
        <span className="rounded-full bg-imoth-grey-bg px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-imoth-grey-muted">
          Coming soon
        </span>
      )}
    </div>
  );

  if (comingSoon || !href) {
    return <div className="cursor-not-allowed">{content}</div>;
  }
  return <Link href={href}>{content}</Link>;
}
