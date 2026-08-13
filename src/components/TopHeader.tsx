"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Bell, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { ROLE_LABELS, type RoleName } from "@/lib/roles";
import { signOutAction } from "@/lib/actions/auth-actions";

export function TopHeader({
  userName,
  role,
  onOpenMobile,
}: {
  userName: string;
  role: string;
  onOpenMobile: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const roleLabel = ROLE_LABELS[role as RoleName] ?? role;
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-imoth-grey-border bg-white px-4 py-3.5 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-md p-1.5 text-imoth-navy hover:bg-imoth-grey-bg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-bold text-imoth-navy sm:text-base">Welcome back, {userName.split(" ")[0]}</p>
          <p className="hidden text-xs text-imoth-grey-muted sm:block">Manage Dignity Last Expense business with ease.</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full p-2 text-imoth-grey-muted hover:bg-imoth-grey-bg hover:text-imoth-navy"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-imoth-grey-border py-1.5 pl-1.5 pr-2.5 hover:bg-imoth-grey-bg"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-imoth-blue-pale text-xs font-bold text-imoth-blue">
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight text-imoth-navy">{userName}</span>
              <span className="block text-[11px] leading-tight text-imoth-grey-muted">{roleLabel}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-imoth-grey-muted" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-imoth-grey-border bg-white py-1.5 shadow-lg">
              <div className="border-b border-imoth-grey-border px-3 py-2">
                <p className="text-sm font-semibold text-imoth-navy">{userName}</p>
                <p className="text-xs text-imoth-grey-muted">{roleLabel}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-imoth-grey-muted">
                <UserIcon className="h-4 w-4" /> Profile settings coming soon
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-status-red hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
