/**
 * Placeholder Imoth Insurance Brokers mark — no official logo file has been
 * supplied yet. Built from the described brand palette (navy/blue/red) so it
 * reads as a real corporate mark rather than a generic icon. Swap this file's
 * internals for an <Image src="/imoth-logo.png" /> once the real asset
 * arrives; every call site (`variant="full" | "mark"`, `size`) stays the same.
 */

const SIZES = {
  sm: { box: 28, text: "text-sm", caption: "text-[9px]" },
  md: { box: 36, text: "text-lg", caption: "text-[10px]" },
  lg: { box: 56, text: "text-2xl", caption: "text-xs" },
} as const;

export function ImothMark({ size = "md", className }: { size?: keyof typeof SIZES; className?: string }) {
  const { box } = SIZES[size];
  return (
    <svg
      width={box}
      height={box}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="9" fill="#0A1F44" />
      <path d="M11 27V13L20 21L29 13V27" stroke="white" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="31.5" cy="9.5" r="4" fill="#C8102E" />
    </svg>
  );
}

export function ImothLogo({
  variant = "full",
  size = "md",
  onDark = false,
  className,
}: {
  variant?: "full" | "mark";
  size?: keyof typeof SIZES;
  onDark?: boolean;
  className?: string;
}) {
  if (variant === "mark") {
    return <ImothMark size={size} className={className} />;
  }

  const { text, caption } = SIZES[size];
  const titleColor = onDark ? "text-white" : "text-imoth-navy";
  const captionColor = onDark ? "text-white/60" : "text-imoth-grey-muted";

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <ImothMark size={size} />
      <div className="leading-none">
        <p className={`font-bold tracking-tight ${text} ${titleColor}`}>IMOTH</p>
        <p className={`mt-0.5 font-semibold uppercase tracking-wider ${caption} ${captionColor}`}>
          Insurance Brokers
        </p>
      </div>
    </div>
  );
}
