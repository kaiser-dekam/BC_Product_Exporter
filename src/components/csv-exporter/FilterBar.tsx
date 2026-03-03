"use client";

interface FilterValues {
  includeVariants: boolean;
  includeUnavailable: boolean;
  includeHidden: boolean;
}

interface FilterBarProps {
  values: FilterValues;
  onChange: (key: keyof FilterValues, value: boolean) => void;
}

const FILTER_OPTIONS: { key: keyof FilterValues; label: string }[] = [
  { key: "includeVariants", label: "Include variants" },
  { key: "includeUnavailable", label: "Include unavailable products" },
  { key: "includeHidden", label: "Include hidden products" },
];

export default function FilterBar({ values, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map(({ key, label }) => (
        <label
          key={key}
          className={`
            inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer
            transition-all duration-150 select-none text-sm
            ${
              values[key]
                ? "border-accent/40 bg-accent/10 text-text"
                : "border-border bg-white/[0.02] text-muted hover:bg-white/5"
            }
          `}
        >
          <input
            type="checkbox"
            checked={values[key]}
            onChange={(e) => onChange(key, e.target.checked)}
            className="w-3.5 h-3.5 rounded shrink-0"
          />
          {label}
        </label>
      ))}
    </div>
  );
}
