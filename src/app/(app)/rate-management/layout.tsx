"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";

const TABS = [
  { href: "/rate-management/individual", label: "Individual / Family Rates" },
  { href: "/rate-management/group", label: "Group Rates" },
  { href: "/rate-management/rules", label: "Product Rules" },
  { href: "/rate-management/versions", label: "Rate Versions" },
  { href: "/rate-management/audit", label: "Audit History" },
];

export default function RateManagementLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <PageHeader title="Dignity Product" description="Rate management — Individual/Family and Group rate sets, versioned and auditable." />
      <div className="flex gap-1 overflow-x-auto border-b border-imoth-grey-border">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-imoth-red text-imoth-red"
                  : "border-transparent text-imoth-grey-muted hover:bg-imoth-grey-bg hover:text-imoth-navy"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
