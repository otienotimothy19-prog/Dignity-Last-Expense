export function formatKES(amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  // Built manually rather than via Intl's currency style: ICU renders KES as
  // "Ksh" in some locales/runtimes, and the brand requires "KES" verbatim.
  const number = new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `KES ${number}`;
}

export function formatDateNairobi(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}
