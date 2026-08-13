import { TrendingUp } from "lucide-react";

export function PremiumCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative col-span-full overflow-hidden rounded-xl border border-imoth-navy bg-imoth-navy p-6 shadow-sm sm:col-span-2">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-imoth-red/20 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
