"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface SummarizePanelProps {
  selectedIds: string[];
  onSummarize: (ids: string[]) => Promise<{ summarized: number; errors: string[] }>;
  onClearSelection: () => void;
}

export default function SummarizePanel({ selectedIds, onSummarize, onClearSelection }: SummarizePanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summarized: number; errors: string[] } | null>(null);

  const handleSummarize = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await onSummarize(selectedIds);
      setResult(res);
      setTimeout(() => setResult(null), 8000);
    } catch {
      setResult({ summarized: 0, errors: ["Summarization failed"] });
    } finally {
      setLoading(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <Card className="mb-4 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
          <Button onClick={handleSummarize} loading={loading} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {loading ? "Summarizing..." : "Generate AI Summaries"}
          </Button>
          <Button variant="ghost" onClick={onClearSelection} size="sm">
            Clear Selection
          </Button>
        </div>

        {result && (
          <div className="text-sm">
            {result.summarized > 0 && (
              <span className="text-success mr-3">
                ✓ {result.summarized} summarized
              </span>
            )}
            {result.errors.length > 0 && (
              <span className="text-danger">
                ✗ {result.errors.length} failed
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
