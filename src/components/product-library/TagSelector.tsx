"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ProductTag } from "@/types";

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

interface TagSelectorProps {
  allTags: ProductTag[];
  assignedTagIds: string[];
  saving: boolean;
  onToggle: (tagId: string, nowAssigned: boolean) => void;
  onCreate: (name: string, color: string) => Promise<void>;
  onDelete: (tagId: string) => void;
}

export default function TagSelector({
  allTags,
  assignedTagIds,
  saving,
  onToggle,
  onCreate,
  onDelete,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[5]);
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) { setNameError("Name required"); return; }
    setCreating(true);
    setNameError("");
    try {
      await onCreate(name, newColor);
      setNewName("");
      setNewColor(TAG_COLORS[5]);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setCreating(false);
    }
  }, [newName, newColor, onCreate]);

  const assignedTags = allTags.filter((t) => assignedTagIds.includes(t.id));
  const unassignedTags = allTags.filter((t) => !assignedTagIds.includes(t.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Assigned tag pills + Add button */}
      <div className="flex flex-wrap items-center gap-1.5">
        {assignedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => onToggle(tag.id, false)}
              disabled={saving}
              className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity leading-none"
              title="Remove tag"
            >
              ×
            </button>
          </span>
        ))}

        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border border-dashed border-border text-muted hover:border-accent/50 hover:text-accent transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add tag
        </button>

        {saving && (
          <span className="text-xs text-muted animate-pulse">Saving…</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-3 space-y-3">
          {/* Unassigned tags to add */}
          {unassignedTags.length > 0 && (
            <div>
              <p className="text-xs text-muted font-medium mb-1.5">Add a tag</p>
              <div className="flex flex-wrap gap-1.5">
                {unassignedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => { onToggle(tag.id, true); setOpen(false); }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white opacity-80 hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {unassignedTags.length > 0 && (
            <div className="border-t border-border" />
          )}

          {/* Create new tag */}
          <div>
            <p className="text-xs text-muted font-medium mb-1.5">Create new tag</p>
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="Tag name…"
              maxLength={32}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-border text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 mb-2"
            />
            {nameError && <p className="text-xs text-danger mb-1.5">{nameError}</p>}

            {/* Color swatches */}
            <div className="flex gap-1.5 mb-2">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {newColor === c && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="w-full py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "Creating…" : "Create Tag"}
            </button>
          </div>

          {/* Manage (delete) existing tags */}
          {allTags.length > 0 && (
            <>
              <div className="border-t border-border" />
              <div>
                <p className="text-xs text-muted font-medium mb-1.5">Manage tags</p>
                <div className="space-y-1">
                  {allTags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                      <button
                        onClick={() => onDelete(tag.id)}
                        className="text-xs text-muted hover:text-danger transition-colors"
                        title="Delete tag globally"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
