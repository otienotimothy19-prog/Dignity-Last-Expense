"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

export function RowActionsMenu({ items }: { items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-imoth-grey-muted hover:bg-imoth-grey-bg hover:text-imoth-navy"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-imoth-grey-border bg-white py-1 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-3 py-2 text-sm text-imoth-navy hover:bg-imoth-grey-bg"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
