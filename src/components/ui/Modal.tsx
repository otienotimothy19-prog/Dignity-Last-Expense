"use client";

import { X } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noopSubscribe = () => () => {};

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  // Rendered via a portal to document.body: this component is used from
  // inside table rows, where a modal's div as a direct child of <tr>/<td>
  // is invalid HTML (browsers silently reparent it) and would otherwise be
  // clipped by the table's overflow-x-auto scroll container.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-imoth-navy/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-base font-semibold text-imoth-navy">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-imoth-grey-muted hover:bg-imoth-grey-bg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
