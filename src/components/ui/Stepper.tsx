import { Check } from "lucide-react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? "bg-status-green text-white"
                    : active
                      ? "bg-imoth-red text-white"
                      : "bg-imoth-grey-bg text-imoth-grey-muted"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </span>
              <span className={`text-sm font-medium ${active ? "text-imoth-navy" : "text-imoth-grey-muted"}`}>{label}</span>
            </div>
            {stepNum < steps.length && <span className="h-px w-6 bg-imoth-grey-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}
