"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
  ProductVariant,
  HeaderItem,
  MarkdownTextItem,
} from "@/app/(dashboard)/books/[bookId]/page";
import { getItemId } from "@/app/(dashboard)/books/[bookId]/page";

// Re-export for convenience
export type { SectionItem, ProductItem, ProductVariant, HeaderItem, MarkdownTextItem };

interface SectionEditorProps {
  id: string;
  title: string;
  items: SectionItem[];
  layout: "1-col" | "2-col";
  collapsed: boolean;
  onToggleCollapse: (sectionId: string) => void;
  onRemoveItem: (sectionId: string, itemId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onAddProducts: (sectionId: string, afterItemId?: string) => void;
  onSaveSection?: (sectionId: string, finalTitle: string) => void;
  onAddHeader: (sectionId: string, level: 1 | 2 | 3) => void;
  onUpdateHeader: (sectionId: string, headerId: string, text: string, level: 1 | 2 | 3) => void;
  onAddText: (sectionId: string) => void;
  onUpdateText: (sectionId: string, textId: string, content: string) => void;
  onReorderItems: (sectionId: string, items: SectionItem[]) => void;
  onUpdateProductDescription: (sectionId: string, productId: string, user_description: string | null, description_source: "ai" | "custom") => void;
  onUpdateProductVariants: (sectionId: string, productId: string, variants: ProductVariant[]) => void;
  onUpdateProductOptions: (sectionId: string, productId: string, options: { show_price?: boolean; show_sale_price?: boolean; show_cost_price?: boolean; show_variants?: boolean; show_price_list?: boolean }) => void;
  onUpdateLayout: (sectionId: string, layout: "1-col" | "2-col") => void;
}

// ---------------------------------------------------------------------------
// Count children nested under a header (for collapse badge)
// ---------------------------------------------------------------------------
function countHeaderChildren(items: SectionItem[], headerIndex: number): number {
  const header = items[headerIndex] as HeaderItem;
  let count = 0;
  for (let i = headerIndex + 1; i < items.length; i++) {
    const item = items[i];
    if (item.type === "header" && item.level <= header.level) break;
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Sortable product row
// ---------------------------------------------------------------------------
function SortableProductRow({
  product,
  sectionId,
  onRemove,
  onUpdateDescription,
  onUpdateVariants,
  onUpdateOptions,
}: {
  product: ProductItem;
  sectionId: string;
  onRemove: (sectionId: string, itemId: string) => void;
  onUpdateDescription: (sectionId: string, productId: string, user_description: string | null, description_source: "ai" | "custom") => void;
  onUpdateVariants: (sectionId: string, productId: string, variants: ProductVariant[]) => void;
  onUpdateOptions: (sectionId: string, productId: string, options: { show_price?: boolean; show_sale_price?: boolean; show_cost_price?: boolean; show_variants?: boolean; show_price_list?: boolean }) => void;
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
  const [editingVariants, setEditingVariants] = useState(false);
  const [variantName, setVariantName] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [variantPrice, setVariantPrice] = useState("");

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
  const variants = product.variants ?? [];
  const showPrice = product.show_price ?? true;
  const showSalePrice = product.show_sale_price ?? false;
  const showCostPrice = product.show_cost_price ?? false;
  const showVariants = product.show_variants ?? true;
  const showPriceList = product.show_price_list ?? false;
  const hasPriceListPrice = product.price_list_price != null;

  const addVariant = () => {
    const name = variantName.trim();
    const price = parseFloat(variantPrice);
    if (!name || isNaN(price)) return;
    const newVariant: ProductVariant = {
      id: `var_${Date.now()}`,
      name,
      sku: variantSku.trim() || undefined,
      price,
    };
    onUpdateVariants(sectionId, product.product_cache_id, [...variants, newVariant]);
    setVariantName("");
    setVariantSku("");
    setVariantPrice("");
  };

  const removeVariant = (variantId: string) => {
    onUpdateVariants(sectionId, product.product_cache_id, variants.filter((v) => v.id !== variantId));
  };

  // Price display checkboxes shared between desc editor and variants editor
  const priceCheckboxes = (
    <div className="flex items-center gap-4 flex-wrap">
      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showPrice}
          onChange={(e) => onUpdateOptions(sectionId, product.product_cache_id, { show_price: e.target.checked })}
          className="rounded border-border text-accent focus:ring-accent w-3 h-3"
        />
        Regular price
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showSalePrice}
          onChange={(e) => onUpdateOptions(sectionId, product.product_cache_id, { show_sale_price: e.target.checked })}
          className="rounded border-border text-accent focus:ring-accent w-3 h-3"
        />
        Sale price
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showCostPrice}
          onChange={(e) => onUpdateOptions(sectionId, product.product_cache_id, { show_cost_price: e.target.checked })}
          className="rounded border-border text-accent focus:ring-accent w-3 h-3"
        />
        Cost price
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showVariants}
          onChange={(e) => onUpdateOptions(sectionId, product.product_cache_id, { show_variants: e.target.checked })}
          className="rounded border-border text-accent focus:ring-accent w-3 h-3"
        />
        Variants
      </label>
      {hasPriceListPrice && (
        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showPriceList}
            onChange={(e) => onUpdateOptions(sectionId, product.product_cache_id, { show_price_list: e.target.checked })}
            className="rounded border-border text-accent focus:ring-accent w-3 h-3"
          />
          {product.price_list_label ? `${product.price_list_label} price` : "Price list price"}
        </label>
      )}
    </div>
  );

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

        {/* Variant count badge */}
        {variants.length > 0 && (
          <Badge variant="info" className="flex-shrink-0 text-[10px]">
            {variants.length} var{variants.length !== 1 ? "s" : ""}
          </Badge>
        )}

        {/* Edit variants button */}
        <button
          onClick={() => setEditingVariants(!editingVariants)}
          className={`transition-colors p-1 flex-shrink-0 ${editingVariants ? "text-accent" : "text-muted hover:text-accent"}`}
          title="Edit variants"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

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

          {/* Price display options */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted mb-2">Price Display</p>
            {priceCheckboxes}
          </div>

          <div className="flex items-center justify-end gap-2 mt-3">
            <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Cancel</Button>
            <Button size="sm" onClick={saveDesc}>Save</Button>
          </div>
        </div>
      )}

      {/* Inline variants editor */}
      {editingVariants && (
        <div className="mt-1 mb-2 rounded-lg border border-border bg-surface/50 p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-text">Variants</span>
          </div>

          {/* Price display options */}
          <div className="mb-3 pb-3 border-b border-border/50">
            {priceCheckboxes}
          </div>

          {/* Existing variants */}
          {variants.length > 0 && (
            <div className="space-y-1 mb-3">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center gap-2 p-1.5 rounded bg-white/5 text-xs">
                  <span className="flex-1 font-medium truncate">{v.name}</span>
                  {v.sku && <span className="text-muted flex-shrink-0">{v.sku}</span>}
                  <span className="text-text font-medium flex-shrink-0">${v.price.toFixed(2)}</span>
                  <button
                    onClick={() => removeVariant(v.id)}
                    className="text-muted hover:text-danger transition-colors p-0.5 flex-shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add variant form */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              className="flex-1 text-xs bg-surface border border-border rounded px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Variant name..."
            />
            <input
              type="text"
              value={variantSku}
              onChange={(e) => setVariantSku(e.target.value)}
              className="w-20 text-xs bg-surface border border-border rounded px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="SKU"
            />
            <input
              type="number"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
              className="w-24 text-xs bg-surface border border-border rounded px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Price"
              step="0.01"
              min="0"
            />
            <Button size="sm" onClick={addVariant} disabled={!variantName.trim() || !variantPrice}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable header row — with collapse toggle + add product button
// ---------------------------------------------------------------------------
function SortableHeaderRow({
  header,
  sectionId,
  childCount,
  isCollapsed,
  onRemove,
  onUpdate,
  onToggleCollapse,
  onAddProducts,
}: {
  header: HeaderItem;
  sectionId: string;
  childCount: number;
  isCollapsed: boolean;
  onRemove: (sectionId: string, itemId: string) => void;
  onUpdate: (sectionId: string, headerId: string, text: string, level: 1 | 2 | 3) => void;
  onToggleCollapse: (headerId: string) => void;
  onAddProducts: (sectionId: string, afterItemId?: string) => void;
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

      {/* Collapse toggle */}
      {childCount > 0 && (
        <button
          onClick={() => onToggleCollapse(header.id)}
          className="text-muted hover:text-text transition-colors p-0.5 flex-shrink-0"
          title={isCollapsed ? `Expand (${childCount} hidden)` : "Collapse"}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

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

      {/* Collapsed count */}
      {isCollapsed && childCount > 0 && (
        <span className="text-[10px] text-muted flex-shrink-0">
          {childCount} item{childCount !== 1 ? "s" : ""} hidden
        </span>
      )}

      {/* Type badge */}
      <Badge variant="info" className="flex-shrink-0">
        H{header.level}
      </Badge>

      {/* Add product after this header */}
      <button
        onClick={() => onAddProducts(sectionId, header.id)}
        className="text-muted hover:text-accent transition-colors p-1 flex-shrink-0"
        title="Add product after this header"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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
// Sortable markdown text block
// ---------------------------------------------------------------------------
function SortableTextRow({
  item,
  sectionId,
  onRemove,
  onUpdate,
}: {
  item: MarkdownTextItem;
  sectionId: string;
  onRemove: (sectionId: string, itemId: string) => void;
  onUpdate: (sectionId: string, textId: string, content: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-border bg-surface/30 hover:bg-surface/50 transition-colors"
    >
      {/* Top bar */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50">
        <button
          className="cursor-grab text-muted/40 hover:text-muted p-0.5 flex-shrink-0"
          {...attributes}
          {...listeners}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </button>
        <Badge variant="default" className="flex-shrink-0 text-[10px]">Text</Badge>
        <span className="flex-1 text-xs text-muted truncate">
          {item.content ? item.content.slice(0, 60) + (item.content.length > 60 ? "\u2026" : "") : "Empty text block"}
        </span>
        <button
          onClick={() => onRemove(sectionId, item.id)}
          className="text-muted hover:text-danger transition-colors p-1 flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Textarea */}
      <div className="p-2">
        <textarea
          value={item.content}
          onChange={(e) => onUpdate(sectionId, item.id, e.target.value)}
          className="w-full text-xs bg-transparent border-none focus:outline-none resize-none text-text leading-relaxed placeholder:text-muted/50"
          rows={4}
          placeholder={"Enter markdown text\u2026\nUse **bold**, *italic*, or - bullet points"}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-item dropdown (replaces separate Add / Header / Text buttons)
// ---------------------------------------------------------------------------
function AddItemDropdown({
  sectionId,
  onAddProducts,
  onAddText,
  onAddHeader,
}: {
  sectionId: string;
  onAddProducts: (sectionId: string, afterItemId?: string) => void;
  onAddText: (sectionId: string) => void;
  onAddHeader: (sectionId: string, level: 1 | 2 | 3) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const choose = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
        + Add
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-xl z-30 py-1">
          <button
            onClick={() => choose(() => onAddProducts(sectionId))}
            className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-white/10 transition-colors"
          >
            Product
          </button>
          <button
            onClick={() => choose(() => onAddText(sectionId))}
            className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-white/10 transition-colors"
          >
            Text Box
          </button>
          <button
            onClick={() => choose(() => onAddHeader(sectionId, 1))}
            className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-white/10 transition-colors"
          >
            H1 Header
          </button>
          <button
            onClick={() => choose(() => onAddHeader(sectionId, 2))}
            className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-white/10 transition-colors"
          >
            H2 Header
          </button>
          <button
            onClick={() => choose(() => onAddHeader(sectionId, 3))}
            className="w-full text-left px-3 py-1.5 text-xs text-text hover:bg-white/10 transition-colors"
          >
            H3 Header
          </button>
        </div>
      )}
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
  layout,
  collapsed,
  onToggleCollapse,
  onRemoveItem,
  onRemoveSection,
  onRenameSection,
  onSaveSection,
  onAddProducts,
  onAddHeader,
  onUpdateHeader,
  onAddText,
  onUpdateText,
  onReorderItems,
  onUpdateProductDescription,
  onUpdateProductVariants,
  onUpdateProductOptions,
  onUpdateLayout,
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

  // ---------------------------------------------------------------------------
  // Header collapse state (local to this section)
  // ---------------------------------------------------------------------------
  const [collapsedHeaders, setCollapsedHeaders] = useState<Set<string>>(new Set());

  const toggleHeaderCollapse = (headerId: string) => {
    setCollapsedHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(headerId)) next.delete(headerId);
      else next.add(headerId);
      return next;
    });
  };

  // Compute which items are visible based on collapsed headers
  const visibleItems = useMemo(() => {
    const result: SectionItem[] = [];
    let hideUntilLevel: number | null = null;

    for (const item of items) {
      if (item.type === "header") {
        // If we're hiding and this header is same level or higher → stop hiding
        if (hideUntilLevel !== null && item.level <= hideUntilLevel) {
          hideUntilLevel = null;
        }
        if (hideUntilLevel !== null) {
          // This header is nested under a collapsed parent — skip it
          continue;
        }
        result.push(item);
        // If this header is collapsed, start hiding items under it
        if (collapsedHeaders.has(item.id)) {
          hideUntilLevel = item.level;
        }
      } else {
        if (hideUntilLevel === null) {
          result.push(item);
        }
      }
    }

    return result;
  }, [items, collapsedHeaders]);

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Use the FULL items array for reordering (find by ID)
    const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
    const newIndex = items.findIndex((item) => getItemId(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorderItems(id, reordered);
  };

  const productCount = items.filter((i) => i.type === "product").length;
  const headerCount = items.filter((i) => i.type === "header").length;
  const textCount = items.filter((i) => i.type === "text").length;

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
            {headerCount > 0 && ` \u00B7 ${headerCount} ${headerCount === 1 ? "header" : "headers"}`}
            {textCount > 0 && ` \u00B7 ${textCount} ${textCount === 1 ? "text" : "texts"}`}
          </span>

          {/* Layout toggle */}
          <div className="flex items-center gap-0.5 bg-surface border border-border rounded-lg p-0.5 flex-shrink-0">
            <button
              onClick={() => onUpdateLayout(id, "1-col")}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                layout === "1-col" ? "bg-accent text-[#0b0f1d] font-medium" : "text-muted hover:text-text"
              }`}
              title="Single column"
            >
              1 Col
            </button>
            <button
              onClick={() => onUpdateLayout(id, "2-col")}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                layout === "2-col" ? "bg-accent text-[#0b0f1d] font-medium" : "text-muted hover:text-text"
              }`}
              title="Two columns"
            >
              2 Col
            </button>
          </div>

          {/* Add item dropdown */}
          <AddItemDropdown
            sectionId={id}
            onAddProducts={onAddProducts}
            onAddText={onAddText}
            onAddHeader={onAddHeader}
          />

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
                No items in this section. Click &quot;+ Add&quot; to add products, headers, or text.
              </div>
            ) : (
              <DndContext
                sensors={itemSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext
                  items={visibleItems.map((item) => getItemId(item))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {visibleItems.map((item) =>
                      item.type === "product" ? (
                        <SortableProductRow
                          key={item.product_cache_id}
                          product={item}
                          sectionId={id}
                          onRemove={onRemoveItem}
                          onUpdateDescription={onUpdateProductDescription}
                          onUpdateVariants={onUpdateProductVariants}
                          onUpdateOptions={onUpdateProductOptions}
                        />
                      ) : item.type === "header" ? (
                        <SortableHeaderRow
                          key={item.id}
                          header={item}
                          sectionId={id}
                          childCount={countHeaderChildren(items, items.indexOf(item))}
                          isCollapsed={collapsedHeaders.has(item.id)}
                          onRemove={onRemoveItem}
                          onUpdate={onUpdateHeader}
                          onToggleCollapse={toggleHeaderCollapse}
                          onAddProducts={onAddProducts}
                        />
                      ) : (
                        <SortableTextRow
                          key={item.id}
                          item={item}
                          sectionId={id}
                          onRemove={onRemoveItem}
                          onUpdate={onUpdateText}
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
