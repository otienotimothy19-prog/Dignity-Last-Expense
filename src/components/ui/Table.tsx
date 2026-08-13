"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wraps wide tables with a normal scrollable region plus a second, thin
 * scrollbar that sticks to the bottom of the viewport while the table is in
 * view. Without it, reaching the horizontal scrollbar on a long table means
 * scrolling all the way down past every row first — this keeps it reachable
 * the whole time the table is on screen.
 */
export function TableCard({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [showFloat, setShowFloat] = useState(false);
  // Two independent flags rather than one shared token: each side only ever
  // reads the flag it itself sets, so a delayed/queued native scroll event
  // on one side can never consume the guard meant for the other.
  const ignoreNextMain = useRef(false);
  const ignoreNextFloat = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setScrollWidth(el.scrollWidth);
      setShowFloat(el.scrollWidth > el.clientWidth + 1);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children]);

  function onMainScroll() {
    if (ignoreNextMain.current) {
      ignoreNextMain.current = false;
      return;
    }
    if (floatRef.current && scrollRef.current) {
      ignoreNextFloat.current = true;
      floatRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }

  function onFloatScroll() {
    if (ignoreNextFloat.current) {
      ignoreNextFloat.current = false;
      return;
    }
    if (floatRef.current && scrollRef.current) {
      ignoreNextMain.current = true;
      scrollRef.current.scrollLeft = floatRef.current.scrollLeft;
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-imoth-grey-border bg-white shadow-sm">
        <div ref={scrollRef} onScroll={onMainScroll} className="overflow-x-auto">
          {children}
        </div>
      </div>
      {showFloat && (
        <div
          ref={floatRef}
          onScroll={onFloatScroll}
          className="sticky bottom-0 z-20 mt-1 overflow-x-auto overflow-y-hidden rounded-md border border-imoth-grey-border bg-white shadow-sm"
          style={{ height: 14 }}
        >
          <div style={{ width: scrollWidth, height: 1 }} />
        </div>
      )}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full min-w-max text-left text-sm">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-imoth-grey-border bg-imoth-grey-bg/60 text-xs font-semibold uppercase tracking-wide text-imoth-grey-muted">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 ${className ?? ""}`}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-imoth-grey-border">{children}</tbody>;
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={`transition-colors hover:bg-imoth-grey-bg/50 ${className ?? ""}`}>{children}</tr>;
}

export function Td({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 align-middle text-imoth-navy/90 ${className ?? ""}`}>
      {children}
    </td>
  );
}
