import { Search } from "lucide-react";

export function SearchBar({
  name = "q",
  placeholder = "Search…",
  defaultValue,
}: {
  name?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-imoth-grey-muted" />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-imoth-grey-border bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-imoth-grey-muted focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
      />
    </div>
  );
}

export function FilterSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue ?? ""}
      className="rounded-lg border border-imoth-grey-border bg-white px-3 py-2.5 text-sm text-imoth-navy focus:border-imoth-blue focus:outline-none focus:ring-1 focus:ring-imoth-blue"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
