const STATUS_STYLES: Record<string, string> = {
  // Quotation statuses
  DRAFT: "bg-gray-100 text-gray-700",
  GENERATED: "bg-blue-50 text-blue-700",
  SENT: "bg-purple-50 text-purple-700",
  ACCEPTED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  EXPIRED: "bg-orange-50 text-orange-700",
  CONVERTED_TO_POLICY: "bg-imoth-blue-pale text-imoth-navy",

  // Policy statuses
  PENDING: "bg-orange-50 text-orange-700",
  ACTIVE: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-700",
  LAPSED: "bg-gray-100 text-gray-700",

  // Rate version statuses
  SCHEDULED: "bg-orange-50 text-orange-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

const DOT_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-400",
  GENERATED: "bg-blue-500",
  SENT: "bg-purple-500",
  ACCEPTED: "bg-green-500",
  DECLINED: "bg-red-500",
  EXPIRED: "bg-orange-500",
  CONVERTED_TO_POLICY: "bg-imoth-navy",
  PENDING: "bg-orange-500",
  ACTIVE: "bg-green-500",
  CANCELLED: "bg-red-500",
  LAPSED: "bg-gray-400",
  SCHEDULED: "bg-orange-500",
  INACTIVE: "bg-gray-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600";
  const dot = DOT_STYLES[status] ?? "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
