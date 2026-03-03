"use client";

import Button from "@/components/ui/Button";

interface ExportActionsProps {
  onExport: () => void;
  onReset: () => void;
  onFacebookTemplate: () => void;
  loading: boolean;
}

export default function ExportActions({
  onExport,
  onReset,
  onFacebookTemplate,
  loading,
}: ExportActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={onExport}
        disabled={loading}
        className={`
          inline-flex items-center justify-center gap-2 font-bold
          px-5 py-2.5 text-sm rounded-xl
          text-white
          transition-all duration-150 cursor-pointer
          hover:shadow-lg hover:-translate-y-0.5
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        `}
        style={{
          background: "linear-gradient(135deg, var(--success), var(--accent-2))",
        }}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        Export CSV
      </button>
      <Button variant="secondary" onClick={onReset}>
        Reset Selection
      </Button>
      <Button variant="secondary" onClick={onFacebookTemplate}>
        Facebook Commerce Template
      </Button>
    </div>
  );
}
