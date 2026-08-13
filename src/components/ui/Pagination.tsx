import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v) params.set(k, v);
    }
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-imoth-grey-border px-4 py-3 text-sm">
      <p className="text-imoth-grey-muted">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`inline-flex items-center gap-1 rounded-md border border-imoth-grey-border px-3 py-1.5 ${
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-imoth-grey-bg"
          }`}
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`inline-flex items-center gap-1 rounded-md border border-imoth-grey-border px-3 py-1.5 ${
            page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-imoth-grey-bg"
          }`}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
