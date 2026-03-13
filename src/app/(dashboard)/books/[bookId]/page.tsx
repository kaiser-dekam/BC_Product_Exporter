"use client";

import { useState, useCallback, useEffect, useRef, use } from "react";
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
export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price: number;
}

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
  variants?: ProductVariant[];
  show_main_price?: boolean;             // default true — hide product-level price in PDF
  show_variants?: boolean;               // default true — hide variant rows in PDF
}

export interface HeaderItem {
  type: "header";
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

export interface MarkdownTextItem {
  type: "text";
  id: string;
  content: string;
}

export type SectionItem = ProductItem | HeaderItem | MarkdownTextItem;

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
              variants: item.variants ?? [],
              show_main_price: item.show_main_price ?? true,
              show_variants: item.show_variants ?? true,
            };
          }
          if (item.type === "text") return item;
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
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSectionId, setPickerSectionId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Version snapshots
  const [versions, setVersions] = useState<Array<{ id: string; label: string; created_at: string }>>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);
  const versionsRef = useRef<HTMLDivElement>(null);

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
  // Sync summaries from Product Library (on demand — avoids quota burn)
  // -----------------------------------------------------------------------
  const syncSummaries = useCallback(async () => {
    if (!book) return;
    setSyncing(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      // Paginate through ALL products so large catalogs are fully covered
      const summaryMap = new Map<string, string | null>();
      let cursor = "";
      let hasMore = true;
      while (hasMore) {
        const params = new URLSearchParams({ limit: "200", mode: "picker" });
        if (cursor) params.set("cursor", cursor);
        const prodRes = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!prodRes.ok) throw new Error("Failed to fetch products");
        const prodData = await prodRes.json();
        (prodData.products as Array<{ id: string; claude_summary: string | null }>)
          .forEach((p) => summaryMap.set(p.id, p.claude_summary));
        cursor = prodData.next_cursor || "";
        hasMore = !!prodData.next_cursor;
      }

      const updated = {
        ...book,
        sections: book.sections.map((s) => ({
          ...s,
          items: s.items.map((item) => {
            if (
              item.type === "product" &&
              !item.is_custom &&
              summaryMap.has(item.product_cache_id)
            ) {
              const newSummary = summaryMap.get(item.product_cache_id) ?? item.claude_summary;
              return {
                ...item,
                claude_summary: newSummary,
                // If a real AI summary exists and no custom description overrides it,
                // flip the source to "ai" so the editor badge reflects reality
                description_source:
                  newSummary && !item.user_description ? "ai" : item.description_source,
              };
            }
            return item;
          }),
        })),
      };

      setBook(updated);
      await saveBook(updated);
      setSaveMessage("Summaries synced!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync summaries");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncing(false);
    }
  }, [book, getIdToken, saveBook]);

  // -----------------------------------------------------------------------
  // Version snapshots
  // -----------------------------------------------------------------------
  const fetchVersions = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setVersions(data.versions ?? []);
    } catch {
      // Silently fail — versions are non-critical
    }
  }, [getIdToken, bookId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Close versions dropdown when clicking outside
  useEffect(() => {
    if (!versionsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (versionsRef.current && !versionsRef.current.contains(e.target as Node)) {
        setVersionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [versionsOpen]);

  const saveVersion = useCallback(async (label: string) => {
    if (!label.trim()) return;
    setSavingVersion(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label: label.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save version");
      }

      const newVersion = await res.json();
      setVersions((prev) => [newVersion, ...prev]);
      setVersionLabel("");
      setSaveMessage("Version saved!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingVersion(false);
    }
  }, [getIdToken, bookId]);

  const restoreVersion = useCallback(async (versionId: string) => {
    setRestoringVersion(versionId);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}/versions/${versionId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to restore version");
      }

      // Re-fetch the book to get the restored state
      await fetchBook();
      setVersionsOpen(false);
      setSaveMessage("Version restored!");
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore version");
      setTimeout(() => setError(null), 5000);
    } finally {
      setRestoringVersion(null);
    }
  }, [getIdToken, bookId, fetchBook]);

  const deleteVersion = useCallback(async (versionId: string) => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${bookId}/versions/${versionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to delete version");
      }

      setVersions((prev) => prev.filter((v) => v.id !== versionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete version");
      setTimeout(() => setError(null), 5000);
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
  // Markdown text blocks
  // -----------------------------------------------------------------------
  const addText = useCallback((sectionId: string) => {
    if (!book) return;
    const newText: MarkdownTextItem = {
      type: "text",
      id: `text_${Date.now()}`,
      content: "",
    };
    const updated = {
      ...book,
      sections: book.sections.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newText] } : s
      ),
    };
    setBook(updated);
  }, [book]);

  const updateText = useCallback(
    (sectionId: string, textId: string, content: string) => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.type === "text" && item.id === textId
                    ? { ...item, content }
                    : item
                ),
              }
            : s
        ),
      };
      setBook(updated);
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
  // Product variants
  // -----------------------------------------------------------------------
  const updateProductVariants = useCallback(
    (sectionId: string, productId: string, variants: ProductVariant[]) => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.type === "product" && item.product_cache_id === productId
                    ? { ...item, variants }
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

  const updateProductOptions = useCallback(
    (sectionId: string, productId: string, options: { show_main_price?: boolean; show_variants?: boolean }) => {
      if (!book) return;
      const updated = {
        ...book,
        sections: book.sections.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.type === "product" && item.product_cache_id === productId
                    ? { ...item, ...options }
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
          <Button
            onClick={syncSummaries}
            loading={syncing}
            size="sm"
            variant="ghost"
            title="Pull the latest AI summaries from your Product Library"
          >
            {syncing ? "Syncing..." : "Sync Summaries"}
          </Button>
          <ExportPdfButton
            title={book.title}
            subtitle={book.cover_config.subtitle}
            sections={book.sections}
          />

          {/* Versions dropdown */}
          <div className="relative" ref={versionsRef}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setVersionsOpen(!versionsOpen)}
            >
              Versions{versions.length > 0 ? ` (${versions.length})` : ""}
              <svg className={`w-3 h-3 ml-1 transition-transform ${versionsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {versionsOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {/* Save new version */}
                <div className="p-3 border-b border-border">
                  <p className="text-xs text-muted mb-2">Save current state as a version</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={versionLabel}
                      onChange={(e) => setVersionLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && versionLabel.trim()) {
                          saveVersion(versionLabel);
                        }
                      }}
                      className="flex-1 text-xs bg-white/5 border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted/50"
                      placeholder="Version label..."
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => saveVersion(versionLabel)}
                      loading={savingVersion}
                      disabled={!versionLabel.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                {/* Versions list */}
                <div className="max-h-64 overflow-y-auto">
                  {versions.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted">
                      No saved versions yet
                    </div>
                  ) : (
                    versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-b-0 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{v.label}</p>
                          <p className="text-[10px] text-muted">
                            {new Date(v.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm("Restore this version? The current book state will be overwritten.")) {
                              restoreVersion(v.id);
                            }
                          }}
                          disabled={restoringVersion === v.id}
                          className="text-[10px] text-accent hover:text-accent/80 transition-colors font-medium flex-shrink-0 disabled:opacity-50"
                        >
                          {restoringVersion === v.id ? "Restoring..." : "Restore"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Delete this saved version?")) {
                              deleteVersion(v.id);
                            }
                          }}
                          className="text-muted hover:text-danger transition-colors p-0.5 flex-shrink-0"
                          title="Delete version"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
                onAddText={addText}
                onUpdateText={updateText}
                onReorderItems={reorderItems}
                onUpdateProductDescription={updateProductDescription}
                onUpdateProductVariants={updateProductVariants}
                onUpdateProductOptions={updateProductOptions}
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
