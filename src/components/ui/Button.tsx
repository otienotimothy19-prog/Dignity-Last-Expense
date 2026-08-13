import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const VARIANT_CLASS = {
  primary: `${BASE} bg-imoth-red text-white hover:bg-imoth-red-dark`,
  secondary: `${BASE} border border-imoth-grey-border bg-white text-imoth-navy hover:bg-imoth-grey-bg`,
  ghost: `${BASE} text-imoth-navy hover:bg-imoth-grey-bg`,
  danger: `${BASE} border border-red-200 bg-white text-status-red hover:bg-red-50`,
} as const;

type Variant = keyof typeof VARIANT_CLASS;

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${VARIANT_CLASS.primary} ${className ?? ""}`} {...props} />;
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${VARIANT_CLASS.secondary} ${className ?? ""}`} {...props} />;
}

export function DangerButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${VARIANT_CLASS.danger} ${className ?? ""}`} {...props} />;
}

export function LinkButton({
  href,
  variant = "secondary",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${VARIANT_CLASS[variant]} ${className ?? ""}`}>
      {children}
    </Link>
  );
}
