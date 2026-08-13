import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  href?: string;
  accent?: "blue" | "red" | "green" | "orange" | "navy";
}) {
  const accentClass = {
    blue: "bg-imoth-blue-pale text-imoth-blue",
    red: "bg-imoth-red-pale text-imoth-red",
    green: "bg-green-50 text-status-green",
    orange: "bg-orange-50 text-status-orange",
    navy: "bg-slate-100 text-imoth-navy",
  }[accent];

  const content = (
    <div className="group flex h-full flex-col justify-between rounded-xl border border-imoth-grey-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        {href && (
          <ArrowRight className="h-4 w-4 text-imoth-grey-muted opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-imoth-navy">{value}</p>
        <p className="mt-1 text-sm text-imoth-grey-muted">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}
