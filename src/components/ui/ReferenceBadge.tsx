"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import Link from "next/link";

export function ReferenceBadge({
  reference,
  href,
  withCopy = false,
  size = "md",
}: {
  reference: string;
  href?: string;
  withCopy?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [copied, setCopied] = useState(false);

  const sizeClass = size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";

  const code = (
    <span className={`font-mono font-medium tracking-tight text-imoth-navy ${sizeClass}`}>{reference}</span>
  );

  return (
    <span className="inline-flex items-center gap-2">
      {href ? (
        <Link href={href} className="hover:underline">
          {code}
        </Link>
      ) : (
        code
      )}
      {withCopy && (
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(reference);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded-md border border-imoth-grey-border px-2 py-1 text-xs font-medium text-imoth-grey-muted hover:bg-imoth-grey-bg"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-status-green" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </span>
  );
}
