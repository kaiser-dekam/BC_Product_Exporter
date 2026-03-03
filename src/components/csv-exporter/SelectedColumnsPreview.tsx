"use client";

import { FIELD_OPTIONS } from "@/lib/bigcommerce/fields";

interface SelectedColumnsPreviewProps {
  fields: string[];
}

export default function SelectedColumnsPreview({
  fields,
}: SelectedColumnsPreviewProps) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted italic">No fields selected yet.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((key, index) => (
        <span
          key={key}
          className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg bg-white/5 border border-border text-xs"
        >
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            {index + 1}
          </span>
          <span className="text-text">{FIELD_OPTIONS[key] ?? key}</span>
        </span>
      ))}
    </div>
  );
}
