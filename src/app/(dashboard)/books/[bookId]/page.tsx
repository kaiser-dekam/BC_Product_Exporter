"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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
  arrayMove,
} from "@dnd-kit/sortable";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import SectionEditor from "@/components/books/SectionEditor";
import ProductPicker from "@/components/books/ProductPicker";
import ExportPdfButton from "@/components/pdf/ExportPdfButton";

// ---------------------------------------------------------------------------
// Types — supports both products and header text blocks
// ---------------------------------------------------------------------------
export interface ProductItem {
  type: "product";
  product_cache_id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  claude_summary: string | null;
  user_description: string | null;       // user-written custom description
  description_source: "ai" | "custom";  // which to render in PDF
  is_custom?: boolean;                   // true for manually created products
}

export interface HeaderItem {
  type: "header";
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

export type SectionItem = ProductItem | HeaderItem;

/** Return a unique drag-and-drop ID for any section item. */
export function getItemId(item: SectionItem): string {
  return item.type === "product" ? item.product_cache_id : item.id;
}

interface BookSection {
  id: string;
  title: string;
  items: SectionItem[];
  layout?: "1-col" | "2-col";
}

interface BookData {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  sections: BookSection[];
  cover_config: {
    background_color: string;
    title_font_size: number;
    subtitle: string;
    logo_url: string | null;
  };
}

// ---------------------------------------------------------------------------
// Migrate old books that stored `products` instead of `items`
// ---------------------------------------------------------------------------
function migrateSections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawSections: any[]
): BookSection[] {
  return rawSections.map((s) => ({
    id: s.id,
    title: s.title,
    layout: (s.layout as "1-col" | "2-col") ?? "1-col",
    items: s.items
      ? // New format — items already tagged with `type`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s.items as any[]).map((item) => {
          if (!item.type) return { ...item, type: "product" as const, user_description: null, description_source: "ai" as const };
          if (item.type === "product") {
            return {
              ...item,
              user_description: item.user_description ?? null,
              description_source: item.description_source ?? "ai",
            };
          }
          return item;
        })
      : // Old format — convert plain product objects
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s.products || []).map((p: any) => ({
          ...p,
          type: "product" as const,
          user_description: null,
          description_source: "ai" as const,
        })),
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BookEditorPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = use(params);
  const { getIdToken } = useAuth();
  const router = useRouter();

  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // -----------------------------------------------------------------------
  // Load book (with migration for old `products` format)
  // -----------------------------------------------------------------------
  const fetchBook = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Book not found");
      const data = await res.json();

      // Migrate sections from old `products` format to new `items` format
      data.sections = migrateSections(data.sections || []);

      // Re-hydrate claude_summary from the live product catalog so the book
      // always reflects the latest AI summaries from the Product Library.
      // Only updates products where the user hasn't set a custom description.
      try {
        const prodRes = await fetch(`/api/products?limit=200&mode=picker`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const summaryMap = new Map<string, string | null>(
            (prodData.products as Array<{ id: string; claude_summary: string | null }>)
              .map((p) => [p.id, p.claude_summary])
          );
          data.sections = (data.sections as BookSection[]).map((s) => ({
            ...s,
            items: s.items.map((item) => {
              if (
                item.type === "product" &&
                !item.is_custom &&
                summaryMap.has(item.product_cache_id)
              ) {
                return {
                  ...item,
                  claude_summary: summaryMap.get(item.product_cache_id) ?? item.claude_summary,
                };
              }
              return item;
            }),
          }));
        }
      } catch {
        // Silently fall back to stored summaries
      }

      setBook(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load book");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, bookId]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  // -----------------------------------------------------------------------
  // Save book
  // -----------------------------------------------------------------------
  const saveBook = useCallback(async (updatedBook: BookData) => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: updatedBook.title,
          description: updatedBook.description,
          status: updatedBook.status,
          sections: updatedBook.sections,
          cover_config: updatedBook.cover_config,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to save (${res.status})`);
      }
      setSaveMessage("Saved!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  }, [getIdToken, bookId]);

  // -----------------------------------------------------------------------
  // Section CRUD
  // -----------------------------------------------------------------------
  const addSection = useCallback(() => {
    if (!book) return;
    const newSection: BookSection = {
      id: `section_${Date.now()}`,
      title: "New Section",
      items: [],
    };
    const updated = { ...book, sections: [...book.sections, newSection] };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  const removeSection = useCallback((sectionId: string) => {
    if (!book) return;
    const updated = {
      ...book,
      sections: book.sections.filter((s) => s.id !== sectionId),
    };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  const renameSection = useCallback((sectionId: string, newTitle: string) => {
    if (!book) return;
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId ? { ...s, title: newTitle } : s
      ),
    };
    setBook(updated);
    // Don't auto-save on every keystroke
  }, [book]);

  const saveSectionTitle = useCallback((sectionId: string, finalTitle: string) => {
    if (!book) return;
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId ? { ...s, title: finalTitle } : s
      ),
    };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  // -----------------------------------------------------------------------
  // Item management (products + headers)
  // -----------------------------------------------------------------------
  const removeItem = useCallback((sectionId: string, itemId: string) => {
    if (!book) return;
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.filter((item) => getItemId(item) !== itemId) }
          : s
      ),
    };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  const reorderItems = useCallback((sectionId: string, reorderedItems: SectionItem[]) => {
    if (!book) return;
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId ? { ...s, items: reorderedItems } : s
      ),
    };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  // -----------------------------------------------------------------------
  // Header management
  // -----------------------------------------------------------------------
  const addHeader = useCallback((sectionId: string, level: 1 | 2 | 3) => {
    if (!book) return;
    const newHeader: HeaderItem = {
      type: "header",
      id: `header_${Date.now()}`,
      level,
      text: "",
    };
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, newHeader] }
          : s
      ),
    };
    setBook(updated);
    // Don't auto-save — wait for user to type header text
  }, [book]);

  const updateHeader = useCallback(
    (sectionId: string, headerId: string, text: string, level: 1 | 2 | 3) => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.type === "header" && item.id === headerId
                    ? { ...item, text, level }
                    : item
                ),
              }
            : s
        ),
      };
      setBook(updated);
      // Don't auto-save on keystroke
    },
    [book]
  );

  // -----------------------------------------------------------------------
  // Product description editing
  // -----------------------------------------------------------------------
  const updateProductDescription = useCallback(
    (sectionId: string, productId: string, user_description: string | null, description_source: "ai" | "custom") => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.type === "product" && item.product_cache_id === productId
                    ? { ...item, user_description, description_source }
                    : item
                ),
              }
            : s
        ),
      };
      setBook(updated);
      saveBook(updated);
    },
    [book, saveBook]
  );

  // -----------------------------------------------------------------------
  // Section layout
  // -----------------------------------------------------------------------
  const updateSectionLayout = useCallback(
    (sectionId: string, layout: "1-col" | "2-col") => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId ? { ...s, layout } : s
        ),
      };
      setBook(updated);
      saveBook(updated);
    },
    [book, saveBook]
  );

  // -----------------------------------------------------------------------
  // Product picker
  // -----------------------------------------------------------------------
  const openProductPicker = useCallback((sectionId: string) => {
    setPickerSectionId(sectionId);
    setPickerOpen(true);
  }, []);

  const handleAddProducts = useCallback(
    (products: Array<{ id: string; name: string; sku: string; price: number; primary_image_url: string; claude_summary: string | null; user_description?: string | null; description_source?: "ai" | "custom"; is_custom?: boolean }>) => {
      if (!book || !pickerSectionId) return;
      const newItems: ProductItem[] = products.map((p) => ({
        type: "product" as const,
        product_cache_id: p.id,
        name: p.name,
        sku: p.sku,
        price: p.price,
        primary_image_url: p.primary_image_url,
        claude_summary: p.claude_summary,
        user_description: p.user_description ?? null,
        description_source: p.description_source ?? (p.claude_summary ? "ai" : "custom"),
        is_custom: p.is_custom ?? false,
      }));

      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === pickerSectionId
            ? { ...s, items: [...s.items, ...newItems] }
            : s
        ),
      };
      setBook(updated);
      saveBook(updated);
    },
    [book, pickerSectionId, saveBook]
  );

  // Get existing product IDs in the current picker section
  const existingProductIds = pickerSectionId && book
    ? book.sections
        .find((s) => s.id === pickerSectionId)
        ?.items
        .filter((item): item is ProductItem => item.type === "product")
        .map((p) => p.product_cache_id) || []
    : [];

  // -----------------------------------------------------------------------
  // Collapse / expand
  // -----------------------------------------------------------------------
  const toggleCollapse = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    if (!book) return;
    setCollapsedSections(new Set(book.sections.map((s) => s.id)));
  }, [book]);

  const expandAll = useCallback(() => {
    setCollapsedSections(new Set());
  }, []);

  // -----------------------------------------------------------------------
  // Section drag-and-drop reorder
  // -----------------------------------------------------------------------
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !book) return;

    const oldIndex = book.sections.findIndex((s) => s.id === active.id);
    const newIndex = book.sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = {
      ...book,
      sections: arrayMove(book.sections, oldIndex, newIndex),
    };
    setBook(updated);
    saveBook(updated);
  }, [book, saveBook]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!book) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-lg font-semibold mb-2">Book Not Found</h2>
        <p className="text-muted text-sm mb-4">This book doesn&apos;t exist or you don&apos;t have access.</p>
        <Button onClick={() => router.push("/books")}>Back to Books</Button>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/books")}
            className="text-muted hover:text-text transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <input
              type="text"
              value={book.title}
              onChange={(e) => setBook({ ...book, title: e.target.value })}
              className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-text w-full"
              placeholder="Book title..."
            />
            <input
              type="text"
              value={book.description}
              onChange={(e) => setBook({ ...book, description: e.target.value })}
              className="text-sm text-muted bg-transparent border-none focus:outline-none focus:ring-0 w-full mt-1"
              placeholder="Description (optional)..."
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveMessage && <span className="text-sm text-success">{saveMessage}</span>}
          <ExportPdfButton
            title={book.title}
            subtitle={book.cover_config.subtitle}
            sections={book.sections}
          />
          <Button onClick={() => saveBook(book)} loading={saving} size="sm">
            Save
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {/* Cover Config */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Cover Settings</h3>
        <Input
          label="Subtitle"
          value={book.cover_config.subtitle}
          onChange={(e) =>
            setBook({
              ...book,
              cover_config: { ...book.cover_config, subtitle: e.target.value },
            })
          }
          placeholder="A subtitle for the cover..."
        />
      </Card>

      {/* Sections */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Sections ({book.sections.length})
        </h3>
        <div className="flex items-center gap-2">
          {book.sections.length > 1 && (
            <>
              <button
                onClick={collapseAll}
                className="text-xs text-muted hover:text-text transition-colors"
              >
                Collapse All
              </button>
              <span className="text-muted/30">|</span>
              <button
                onClick={expandAll}
                className="text-xs text-muted hover:text-text transition-colors"
              >
                Expand All
              </button>
            </>
          )}
          <Button size="sm" variant="secondary" onClick={addSection}>
            + Add Section
          </Button>
        </div>
      </div>

      {book.sections.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center mb-6">
          <svg className="w-10 h-10 text-muted/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-muted mb-3">No sections yet. Add a section to start building your book.</p>
          <Button size="sm" onClick={addSection}>Add First Section</Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={book.sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {book.sections.map((section) => (
              <SectionEditor
                key={section.id}
                id={section.id}
                title={section.title}
                items={section.items}
                layout={section.layout ?? "1-col"}
                collapsed={collapsedSections.has(section.id)}
                onToggleCollapse={toggleCollapse}
                onRemoveItem={removeItem}
                onRemoveSection={removeSection}
                onRenameSection={renameSection}
                onSaveSection={saveSectionTitle}
                onAddProducts={openProductPicker}
                onAddHeader={addHeader}
                onUpdateHeader={updateHeader}
                onReorderItems={reorderItems}
                onUpdateProductDescription={updateProductDescription}
                onUpdateLayout={updateSectionLayout}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Product Picker Modal */}
      <ProductPicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerSectionId(null);
        }}
        onAdd={handleAddProducts}
        existingProductIds={existingProductIds}
      />
    </div>
  );
}
