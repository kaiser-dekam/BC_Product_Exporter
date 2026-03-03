"use client";

import { FIELD_OPTIONS } from "@/lib/bigcommerce/fields";

interface FieldLibraryProps {
  selectedFields: string[];
  onToggle: (field: string) => void;
}

export default function FieldLibrary({
  selectedFields,
  onToggle,
}: FieldLibraryProps) {
  const fieldEntries = Object.entries(FIELD_OPTIONS);

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      }}
    >
      {fieldEntries.map(([key, label]) => {
        const isSelected = selectedFields.includes(key);
        return (
          <label
            key={key}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer
              transition-all duration-150 select-none text-sm
              ${
                isSelected
                  ? "border-accent/40 bg-accent/10 text-text"
                  : "border-border bg-white/[0.02] text-muted hover:border-border hover:bg-white/5"
              }
            `}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(key)}
              className="w-3.5 h-3.5 rounded shrink-0"
            />
            <span className="truncate">{label}</span>
          </label>
        );
      })}
    </div>
  );
}
