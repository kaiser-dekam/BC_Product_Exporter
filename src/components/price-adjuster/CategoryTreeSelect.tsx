"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface CategoryNode {
  id: number;
  name: string;
  children: CategoryNode[];
}

interface CategoryTreeSelectProps {
  categories: CategoryNode[];
  selectedCategory: string;
  onSelect: (categoryName: string) => void;
  loading?: boolean;
}

function TreeNode({
  node,
  depth,
  selectedCategory,
  onSelect,
  expandedIds,
  toggleExpand,
}: {
  node: CategoryNode;
  depth: number;
  selectedCategory: string;
  onSelect: (name: string) => void;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedCategory === node.name;

  return (
    <>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm
          ${isSelected ? "bg-accent/15 text-accent" : "text-text hover:bg-white/5"}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-muted hover:text-text transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span
          className="truncate flex-1"
          onClick={() => onSelect(isSelected ? "" : node.name)}
        >
          {node.name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedCategory={selectedCategory}
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function CategoryTreeSelect({
  categories,
  selectedCategory,
  onSelect,
  loading,
}: CategoryTreeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (name: string) => {
      onSelect(name);
      setIsOpen(false);
    },
    [onSelect]
  );

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative sm:w-64">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl
          bg-white/5 border border-border text-sm text-left
          focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedCategory ? "text-text" : "text-muted/50"}>
          {loading ? "Loading categories..." : selectedCategory || "All Categories"}
        </span>
        <svg
          className={`w-4 h-4 text-muted flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] max-h-80 overflow-y-auto
          bg-card border border-border rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
          {/* All Categories option */}
          <div
            onClick={() => handleSelect("")}
            className={`px-3 py-2 cursor-pointer transition-colors text-sm border-b border-border/50
              ${!selectedCategory ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5"}`}
          >
            All Categories
          </div>

          {categories.length === 0 && !loading ? (
            <div className="px-3 py-4 text-sm text-muted text-center">
              No categories found. Sync your store first.
            </div>
          ) : (
            <div className="py-1">
              {categories.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedCategory={selectedCategory}
                  onSelect={handleSelect}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
