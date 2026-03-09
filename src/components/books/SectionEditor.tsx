"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type {
  SectionItem,
  ProductItem,
  HeaderItem,
} from "@/app/(dashboard)/books/[bookId]/page";
import { getItemId } from "@/app/(dashboard)/books/[bookId]/page";

// Re-export for convenience
export type { SectionItem, ProductItem, HeaderItem };

interface SectionEditorProps {
  id: string;
  title: string;
  items: SectionItem[];
  collapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onRemoveItem: (sectionId: string, itemId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onAddProducts: (sectionId: string) => void;
  onSaveSection?: (sectionId: string, finalTitle: string) => void;
  onAddHeader: (sectionId: string, level: 1 | 2 | 3) => void;
  onUpdateHeader: (sectionId: string, headerId: string, text: string, level: 1 | 2 | 3) => void;
  onReorderItems: (sectionId: string, items: SectionItem[]) => void;
  onUpdateProductDescription: (sectionId: string, productId: string, user_description: string | null, description_source: "ai" | "custom") => void;
}

// ---------------------------------------------------------------------------
// Sortable product row
// ---------------------------------------------------------------------------
function SortableProductRow({
  product,
  sectionId,
  onRemove,
  onUpdateDescription,
}: {
  product: ProductItem;
  sectionId: string;
  onRemove: (sectionId: string, itemId: string) => void;
  onUpdateDescription: (sectionId: string, productId: string, user_description: string | null, description_source: "ai" | "custom") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.product_cache_id });

  const [editingDesc, setEditingDesc] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [draftSource, setDraftSource] = useState<"ai" | "custom">("ai");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const openDescEditor = () => {
    setDraftText(product.user_description ?? "");
    setDraftSource(product.description_source ?? (product.claude_summary ? "ai" : "custom"));
    setEditingDesc(true);
  };

  const saveDesc = () => {
    const trimmed = draftText.trim();
    onUpdateDescription(sectionId, product.product_cache_id, trimmed || null, draftSource);
    setEditingDesc(false);
  };

  const activeSource = product.description_source ?? (product.claude_summary ? "ai" : "custom");
  const hasCustom = !!product.user_description;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Main row */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
        {/* Drag handle */}
        <button
          className="cursor-grab text-muted/40 hover:text-muted p-0.5 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>

        {/* Product image */}
        <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
          {product.primary_image_url ? (
            <img
              src={product.primary_image_url}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted">No img</span>
          )}
        </div>

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {product.name}
            {product.is_custom && (
              <span className="ml-1.5 text-[10px] text-muted/60">(custom)</span>
            )}
          </p>
          <p className="text-xs text-muted">
            {product.sku && `SKU: ${product.sku} · `}${product.price.toFixed(2)}
          </p>
        </div>

        {/* Description source badge */}
        {hasCustom && activeSource === "custom" ? (
          <Badge variant="warning" className="flex-shrink-0 text-[10px]">Custom</Badge>
        ) : product.claude_summary ? (
          <Badge variant="success" className="flex-shrink-0 text-[10px]">AI</Badge>
        ) : null}

        {/* Edit description button */}
        <button
          onClick={openDescEditor}
          className="text-muted hover:text-accent transition-colors p-1 flex-shrink-0"
          title="Edit description"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Remove button */}
        <button
          onClick={() => onRemove(sectionId, product.product_cache_id)}
          className="text-muted hover:text-danger transition-colors p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Inline description editor */}
      {editingDesc && (
        <div className="mt-1 mb-2 rounded-lg border border-border bg-surface/50 p-3">
          {/* Source toggle */}
          <div className="flex items-center gap-1 mb-3 bg-surface rounded-lg p-1 w-fit">
            <button
              onClick={() => setDraftSource("ai")}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                draftSource === "ai"
                  ? "bg-accent text-[#0b0f1d] font-medium"
                  : "text-muted hover:text-text"
              }`}
            >
              AI Summary
            </button>
            <button
              onClick={() => setDraftSource("custom")}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                draftSource === "custom"
                  ? "bg-accent text-[#0b0f1d] font-medium"
                  : "text-muted hover:text-text"
              }`}
            >
              Custom
            </button>
          </div>

          {draftSource === "ai" ? (
            <div className="text-xs text-muted bg-surface rounded-lg p-2.5 min-h-[60px] whitespace-pre-wrap leading-relaxed border border-border/50">
              {product.claude_summary || "No AI summary available for this product."}
            </div>
          ) : (
            <div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                className="w-full text-xs bg-surface border border-border rounded-lg p-2.5 text-text resize-none focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
                rows={5}
                placeholder="Enter custom description… (use - for bullet points)"
                autoFocus
              />
              {product.claude_summary && (
                <button
                  onClick={() => setDraftText(product.claude_summary!)}
                  className="mt-1 text-xs text-muted hover:text-accent transition-colors"
                >
                  ↓ Fill from AI Summary
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Cancel</Button>
            <Button size="sm" onClick={saveDesc}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable header row
// ---------------------------------------------------------------------------
function SortableHeaderRow({
  header,
  sectionId,
  onRemove,
  onUpdate,
}: {
  header: HeaderItem;
  sectionId: string;
  onRemove: (sectionId: string, itemId: string) => void;
  onUpdate: (sectionId: string, headerId: string, text: string, level: 1 | 2 | 3) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: header.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const fontSizeClass =
    header.level === 1
      ? "text-lg font-bold"
      : header.level === 2
      ? "text-base font-semibold"
      : "text-sm font-medium";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-2 rounded-lg bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors"
    >
      {/* Drag handle */}
      <button
        className="cursor-grab text-muted/40 hover:text-muted p-0.5 flex-shrink-0"
        {...attributes}
        {...listeners}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Level selector */}
      <select
        value={header.level}
        onChange={(e) =>
          onUpdate(sectionId, header.id, header.text, Number(e.target.value) as 1 | 2 | 3)
        }
        className="bg-surface border border-border rounded px-1.5 py-0.5 text-xs text-muted focus:outline-none focus:ring-1 focus:ring-accent flex-shrink-0"
      >
        <option value={1}>H1</option>
        <option value={2}>H2</option>
        <option value={3}>H3</option>
      </select>

      {/* Header text input */}
      <input
        type="text"
        value={header.text}
        onChange={(e) => onUpdate(sectionId, header.id, e.target.value, header.level)}
        className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-text ${fontSizeClass}`}
        placeholder={`Heading ${header.level} text...`}
      />

      {/* Type badge */}
      <Badge variant="info" className="flex-shrink-0">
        H{header.level}
      </Badge>

      {/* Remove button */}
      <button
        onClick={() => onRemove(sectionId, header.id)}
        className="text-muted hover:text-danger transition-colors p-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section editor
// ---------------------------------------------------------------------------
export default function SectionEditor({
  id,
  title,
  items,
  collapsed,
  onToggleCollapse,
  onRemoveItem,
  onRemoveSection,
  onRenameSection,
  onSaveSection,
  onAddProducts,
  onAddHeader,
  onUpdateHeader,
  onReorderItems,
  onUpdateProductDescription,
}: SectionEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Separate sensors for the nested item DndContext so it doesn't
  // conflict with the parent section DndContext.
  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
    const newIndex = items.findIndex((item) => getItemId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorderItems(id, reordered);
  };

  const productCount = items.filter((i) => i.type === "product").length;
  const headerCount = items.filter((i) => i.type === "header").length;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4">
        {/* Section header */}
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab text-muted hover:text-text p-1"
            {...attributes}
            {...listeners}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => onToggleCollapse(id)}
            className="text-muted hover:text-text transition-colors p-1"
            title={collapsed ? "Expand section" : "Collapse section"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => onRenameSection(id, e.target.value)}
            onBlur={(e) => onSaveSection?.(id, e.target.value)}
            className="flex-1 bg-transparent border-none text-lg font-semibold focus:outline-none focus:ring-0 text-text"
            placeholder="Section title..."
          />

          {/* Item count badge */}
          <span className="text-xs text-muted flex-shrink-0">
            {productCount} {productCount === 1 ? "product" : "products"}
            {headerCount > 0 && ` · ${headerCount} ${headerCount === 1 ? "header" : "headers"}`}
          </span>

          <Button size="sm" variant="ghost" onClick={() => onAddProducts(id)}>
            + Add
          </Button>

          {/* Add Header dropdown */}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onAddHeader(id, Number(e.target.value) as 1 | 2 | 3);
                e.target.value = "";
              }
            }}
            className="bg-surface border border-border rounded-lg px-2 py-1 text-xs text-muted hover:text-text focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="">+ Header</option>
            <option value="1">H1 — Large</option>
            <option value="2">H2 — Medium</option>
            <option value="3">H3 — Small</option>
          </select>

          <Button size="sm" variant="danger" onClick={() => onRemoveSection(id)}>
            Remove
          </Button>
        </div>

        {/* Collapsible content */}
        {!collapsed && (
          <div className="mt-3">
            {/* Items list */}
            {items.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted border border-dashed border-border rounded-xl">
                No items in this section. Click &quot;+ Add&quot; for products or &quot;+ Header&quot; for text.
              </div>
            ) : (
              <DndContext
                sensors={itemSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext
                  items={items.map((item) => getItemId(item))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {items.map((item) =>
                      item.type === "product" ? (
                        <SortableProductRow
                          key={item.product_cache_id}
                          product={item}
                          sectionId={id}
                          onRemove={onRemoveItem}
                          onUpdateDescription={onUpdateProductDescription}
                        />
                      ) : (
                        <SortableHeaderRow
                          key={item.id}
                          header={item}
                          sectionId={id}
                          onRemove={onRemoveItem}
                          onUpdate={onUpdateHeader}
                        />
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
