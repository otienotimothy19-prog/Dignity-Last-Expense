import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-imoth-grey-bg">
        <Icon className="h-6 w-6 text-imoth-grey-muted" />
      </div>
      <p className="text-sm font-semibold text-imoth-navy">{title}</p>
      {description && <p className="max-w-sm text-sm text-imoth-grey-muted">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
