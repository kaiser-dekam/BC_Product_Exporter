"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { ProductTag } from "@/types";

interface SummarizePanelProps {
  selectedIds: string[];
  onSummarize: (ids: string[]) => Promise<{ summarized: number; errors: string[] }>;
  onClearSelection: () => void;
  allTags?: ProductTag[];
  onApplyTag?: (tagId: string) => Promise<{ applied: number }>;
}

export default function SummarizePanel({
  selectedIds,
  onSummarize,
  onClearSelection,
  allTags = [],
  onApplyTag,
}: SummarizePanelProps) {
  const [summarizing, setSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{ summarized: number; errors: string[] } | null>(null);

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [tagResult, setTagResult] = useState<string | null>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Close tag dropdown on outside click
  useEffect(() => {
    if (!tagDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tagDropdownOpen]);

  const handleSummarize = async () => {
    setSummarizing(true);
    setSummaryResult(null);
    try {
      const res = await onSummarize(selectedIds);
      setSummaryResult(res);
      setTimeout(() => setSummaryResult(null), 8000);
    } catch {
      setSummaryResult({ summarized: 0, errors: ["Summarization failed"] });
    } finally {
      setSummarizing(false);
    }
  };

  const handleApplyTag = async (tagId: string) => {
    if (!onApplyTag) return;
    setTagDropdownOpen(false);
    setTagging(true);
    setTagResult(null);
    try {
      const { applied } = await onApplyTag(tagId);
      const tag = allTags.find((t) => t.id === tagId);
      setTagResult(
        applied > 0
          ? `Added "${tag?.name}" to ${applied} product${applied !== 1 ? "s" : ""}`
          : `All selected products already have this tag`
      );
      setTimeout(() => setTagResult(null), 5000);
    } catch {
      setTagResult("Failed to apply tag");
    } finally {
      setTagging(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <Card className="mb-4 border-accent/30 bg-accent/5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-sm font-semibold">
            {selectedIds.length} product{selectedIds.length !== 1 ? "s" : ""} selected
          </span>

          <Button onClick={handleSummarize} loading={summarizing} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {summarizing ? "Summarizing..." : "Generate AI Summaries"}
          </Button>

          {onApplyTag && allTags.length > 0 && (
            <div className="relative" ref={tagDropdownRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTagDropdownOpen((v) => !v)}
                loading={tagging}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 10V5a2 2 0 012-2z" />
                </svg>
                {tagging ? "Applying…" : "Add Tag"}
              </Button>

              {tagDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 z-50 w-48 bg-card border border-border rounded-xl shadow-xl py-1">
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleApplyTag(tag.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button variant="ghost" onClick={onClearSelection} size="sm">
            Clear Selection
          </Button>
        </div>

        <div className="text-sm flex items-center gap-4">
          {summaryResult && (
            <>
              {summaryResult.summarized > 0 && (
                <span className="text-success">✓ {summaryResult.summarized} summarized</span>
              )}
              {summaryResult.errors.length > 0 && (
                <span className="text-danger">✗ {summaryResult.errors.length} failed</span>
              )}
            </>
          )}
          {tagResult && (
            <span className="text-success">✓ {tagResult}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
