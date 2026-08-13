"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  SlidersHorizontal,
  ShieldCheck,
  Building2,
  UserPlus,
  Wallet,
  RefreshCw,
  FolderOpen,
  BarChart3,
  UserCog,
  ClipboardList,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  X,
  type LucideIcon,
} from "lucide-react";
import { ImothLogo, ImothMark } from "@/components/ImothLogo";

type NavItem = { label: string; href: string; icon: LucideIcon; comingSoon?: boolean };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Quotations", href: "/quotations", icon: FileText },
  { label: "Rate Management", href: "/rate-management", icon: SlidersHorizontal },
  { label: "Policies", href: "/policies", icon: ShieldCheck },
  { label: "Clients / Groups", href: "#", icon: Building2, comingSoon: true },
  { label: "Members", href: "#", icon: UserPlus, comingSoon: true },
  { label: "Payments", href: "#", icon: Wallet, comingSoon: true },
  { label: "Renewals", href: "#", icon: RefreshCw, comingSoon: true },
  { label: "Documents", href: "#", icon: FolderOpen, comingSoon: true },
  { label: "Reports", href: "#", icon: BarChart3, comingSoon: true },
  { label: "Users", href: "#", icon: UserCog, comingSoon: true },
  { label: "Audit Logs", href: "#", icon: ClipboardList, comingSoon: true },
  { label: "Settings", href: "#", icon: Settings, comingSoon: true },
];

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => href !== "#" && (pathname === href || pathname.startsWith(`${href}/`));

  const body = (
    <div className="flex h-full flex-col bg-imoth-navy">
      <div className={`flex items-center border-b border-white/10 px-4 py-5 ${collapsed ? "justify-center" : "justify-between"}`}>
        {collapsed ? <ImothMark size="md" /> : <ImothLogo variant="full" size="sm" onDark />}
        <button
          type="button"
          onClick={onCloseMobile}
          className="rounded-md p-1.5 text-white/70 hover:bg-white/10 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={item.label}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/50 ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/60">
                      Soon
                    </span>
                  </>
                )}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-imoth-navy px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                    {item.label} · Soon
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active
                  ? "bg-imoth-red text-white shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-imoth-navy px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className="hidden items-center justify-center gap-2 border-t border-white/10 px-3 py-3.5 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white md:flex"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 transition-all duration-200 md:block ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
      >
        {body}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onCloseMobile} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{body}</aside>
        </div>
      )}
    </>
  );
}
