"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import ProductCard from "@/components/product-library/ProductCard";
import SyncButton from "@/components/product-library/SyncButton";
import SummarizePanel from "@/components/product-library/SummarizePanel";
import ProductDetailModal from "@/components/product-library/ProductDetailModal";
import { invalidatePickerCache } from "@/components/books/ProductPicker";
import CategoryTreeSelect, { type CategoryNode } from "@/components/price-adjuster/CategoryTreeSelect";
import type { ProductTag } from "@/types";

interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number;
  cost_price: number;
  primary_image_url: string;
  brand_name: string;
  description?: string;
  inventory_level: number;
  is_visible: boolean;
  availability: string;
  weight: number;
  width: number;
  height: number;
  depth: number;
  custom_url: string;
  category_names: string[];
  claude_summary: string | null;
  claude_model_used: string | null;
}

const PAGE_SIZE = 200;

export default function ProductLibraryPage() {
  const { getIdToken } = useAuth();

  const [allProducts, setAllProducts] = useState<CachedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailProduct, setDetailProduct] = useState<CachedProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Category filter
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Tags
  const [allTags, setAllTags] = useState<ProductTag[]>([]);
  // productId → tag_id[]
  const [tagAssignments, setTagAssignments] = useState<Record<string, string[]>>({});
  const [tagsSaving, setTagsSaving] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // How many products to show (for "Show More" in filtered results)
  const [visibleCount, setVisibleCount] = useState(50);

  // Price lists
  const [priceLists, setPriceLists] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<string>("");
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [priceListName, setPriceListName] = useState<string>("");

  // Load ALL products once using cursor pagination (one-time cost)
  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      let all: CachedProduct[] = [];
      let cursor = "";
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to load products");

        const data = await res.json();
        all = [...all, ...data.products];

        if (data.next_cursor) {
          cursor = data.next_cursor;
        } else {
          hasMore = false;
        }
      }

      setAllProducts(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Fetch category tree from BigCommerce
  const fetchCategoryTree = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/bigcommerce/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategoryTree(data.categories || []);
      }
    } catch {
      // Non-critical — filter simply won't appear
    } finally {
      setCategoriesLoading(false);
    }
  }, [getIdToken]);

  // Fetch all tags and their assignments
  const fetchTags = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/tags", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setAllTags(data.tags || []);
      // Build productId → tagId[] map
      const map: Record<string, string[]> = {};
      for (const a of data.assignments || []) {
        if (!map[a.product_id]) map[a.product_id] = [];
        map[a.product_id].push(a.tag_id);
      }
      setTagAssignments(map);
    } catch {
      // Tags are non-critical; silently fail
    }
  }, [getIdToken]);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/bigcommerce/sync", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLastSyncedAt(data.last_synced_at || null);
        setProductCount(data.product_count || 0);
      }
    } catch {
      // Silently fail for status check
    }
  }, [getIdToken]);

  // Initial load — fetch once
  const initialLoad = useRef(false);
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    fetchAllProducts();
    fetchSyncStatus();
    fetchCategoryTree();
    fetchTags();
  }, [fetchAllProducts, fetchSyncStatus, fetchCategoryTree, fetchTags]);

  // Load price lists on mount
  useEffect(() => {
    async function loadPriceLists() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/price-lists", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setPriceLists(data.price_lists || []);
        }
      } catch {
        // Non-critical
      }
    }
    loadPriceLists();
  }, [getIdToken]);

  // Fetch price map when selected price list changes
  useEffect(() => {
    if (!selectedPriceListId) {
      setPriceMap({});
      setPriceListName("");
      return;
    }
    async function loadPriceMap() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`/api/price-lists/${selectedPriceListId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPriceMap(data.price_map || {});
          setPriceListName(data.name || "");
        }
      } catch {
        // Non-critical
      }
    }
    loadPriceMap();
  }, [selectedPriceListId, getIdToken]);

  // Tag handlers
  const handleTagToggle = useCallback(async (tagId: string, nowAssigned: boolean) => {
    if (!detailProduct) return;
    const productId = detailProduct.id;
    const current = tagAssignments[productId] || [];
    const newIds = nowAssigned
      ? [...current, tagId]
      : current.filter((id) => id !== tagId);

    // Optimistic update
    setTagAssignments((prev) => ({ ...prev, [productId]: newIds }));
    setTagsSaving(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/products/${productId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tag_ids: newIds }),
      });
    } catch {
      // Revert on error
      setTagAssignments((prev) => ({ ...prev, [productId]: current }));
    } finally {
      setTagsSaving(false);
    }
  }, [detailProduct, tagAssignments, getIdToken]);

  const handleTagCreate = useCallback(async (name: string, color: string) => {
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create tag");
    setAllTags((prev) => [...prev, data.tag]);
  }, [getIdToken]);

  const handleTagDelete = useCallback(async (tagId: string) => {
    // Optimistic update
    setAllTags((prev) => prev.filter((t) => t.id !== tagId));
    setTagAssignments((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].filter((id) => id !== tagId);
      }
      return next;
    });
    if (activeTagFilter === tagId) setActiveTagFilter(null);
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`/api/tags/${tagId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Re-fetch to restore state if delete failed
      fetchTags();
    }
  }, [getIdToken, activeTagFilter, fetchTags]);

  // Collect all category names in a subtree (for sub-category matching)
  const getDescendantNames = useCallback((name: string, nodes: CategoryNode[]): Set<string> => {
    const result = new Set<string>();
    const visit = (nodeList: CategoryNode[]) => {
      for (const node of nodeList) {
        if (node.name === name || result.size > 0) {
          // Once we've found the root, collect everything below it
          result.add(node.name);
          visit(node.children);
        } else {
          // Still searching — recurse into children
          visit(node.children);
          // If the target was found inside children, this node is an ancestor; skip
        }
      }
    };
    // Two-pass: first find the target node, then collect its subtree
    const findAndCollect = (nodeList: CategoryNode[]): boolean => {
      for (const node of nodeList) {
        if (node.name === name) {
          result.add(node.name);
          const collectAll = (children: CategoryNode[]) => {
            for (const c of children) { result.add(c.name); collectAll(c.children); }
          };
          collectAll(node.children);
          return true;
        }
        if (findAndCollect(node.children)) return true;
      }
      return false;
    };
    findAndCollect(nodes);
    return result;
  }, []);

  // Client-side search + category + tag filtering (no API calls)
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (selectedCategory) {
      const names = getDescendantNames(selectedCategory, categoryTree);
      result = result.filter((p) => p.category_names?.some((n) => names.has(n)));
    }

    if (activeTagFilter) {
      result = result.filter((p) => (tagAssignments[p.id] || []).includes(activeTagFilter));
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const sku = (p.sku || "").toLowerCase();
        return name.includes(term) || sku.includes(term);
      });
    }

    return result;
  }, [allProducts, search, selectedCategory, categoryTree, getDescendantNames, activeTagFilter, tagAssignments]);

  // Products to display (capped by visibleCount)
  const displayProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = filteredProducts.length > visibleCount;

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(50);
  }, [search, selectedCategory, activeTagFilter]);

  // Add a tag to all selected products (skips products that already have it)
  const handleBulkApplyTag = useCallback(async (tagId: string): Promise<{ applied: number }> => {
    const token = await getIdToken();
    if (!token) throw new Error("Not authenticated");

    const toUpdate = selectedIds.filter(
      (id) => !(tagAssignments[id] || []).includes(tagId)
    );

    if (toUpdate.length === 0) return { applied: 0 };

    // Optimistic update
    setTagAssignments((prev) => {
      const next = { ...prev };
      for (const id of toUpdate) {
        next[id] = [...(prev[id] || []), tagId];
      }
      return next;
    });

    await Promise.all(
      toUpdate.map((id) =>
        fetch(`/api/products/${id}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tag_ids: [...(tagAssignments[id] || []), tagId] }),
        })
      )
    );

    return { applied: toUpdate.length };
  }, [getIdToken, selectedIds, tagAssignments]);

  // Handle sync
  const handleSync = useCallback(async () => {
    setSyncLoading(true);
    setError(null);
    setSyncMessage(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/bigcommerce/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Sync failed");
      }

      const data = await res.json();
      setSyncMessage(`Synced ${data.synced} products`);
      setTimeout(() => setSyncMessage(null), 5000);

      // Invalidate picker cache since products changed
      invalidatePickerCache();

      // Re-fetch all products
      initialLoad.current = false;
      await fetchAllProducts();
      await fetchSyncStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncLoading(false);
    }
  }, [getIdToken, fetchAllProducts, fetchSyncStatus]);

  // Toggle product selection
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Handle product click — lazy-load description
  const handleProductClick = useCallback(async (product: CachedProduct) => {
    setDetailProduct(product);

    if (product.description !== undefined) return;

    setDetailLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/products/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const fullProduct = await res.json();
        setDetailProduct((prev) => prev ? { ...prev, description: fullProduct.description || "" } : null);
        setAllProducts((prev) =>
          prev.map((p) => p.id === product.id ? { ...p, description: fullProduct.description || "" } : p)
        );
      }
    } catch {
      // Modal still works without description
    } finally {
      setDetailLoading(false);
    }
  }, [getIdToken]);

  // Handle AI summarization
  const handleSummarize = useCallback(
    async (ids: string[]): Promise<{ summarized: number; errors: string[] }> => {
      const token = await getIdToken();
      if (!token) return { summarized: 0, errors: ["Not authenticated"] };

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_ids: ids }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        return { summarized: 0, errors: [body?.error || "Summarization failed"] };
      }

      const data = await res.json();

      // Invalidate picker cache since summaries changed
      invalidatePickerCache();

      // Re-fetch products
      initialLoad.current = false;
      await fetchAllProducts();

      return { summarized: data.summarized, errors: data.errors || [] };
    },
    [getIdToken, fetchAllProducts]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Product Library</h1>
          <p className="text-muted text-sm">
            Sync your BigCommerce products and manage AI summaries.
          </p>
        </div>
        <SyncButton
          onSync={handleSync}
          loading={syncLoading}
          lastSyncedAt={lastSyncedAt}
          productCount={productCount}
        />
      </div>

      {/* Messages */}
      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}
      {syncMessage && (
        <Card className="mb-4 border-success/30 bg-success/5">
          <p className="text-sm text-success">{syncMessage}</p>
        </Card>
      )}

      {/* Summarize Panel */}
      <SummarizePanel
        selectedIds={selectedIds}
        onSummarize={handleSummarize}
        onClearSelection={() => setSelectedIds([])}
        allTags={allTags}
        onApplyTag={handleBulkApplyTag}
      />

      {/* Search + Category filter + Price List selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <CategoryTreeSelect
          categories={categoryTree}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
          loading={categoriesLoading}
        />
        {priceLists.length > 0 && (
          <select
            value={selectedPriceListId}
            onChange={(e) => setSelectedPriceListId(e.target.value)}
            className="bg-panel border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-[180px]"
          >
            <option value="">No price list</option>
            {priceLists.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tag filter row */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="text-xs text-muted">Tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => setActiveTagFilter((prev) => (prev === tag.id ? null : tag.id))}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={
                activeTagFilter === tag.id
                  ? { backgroundColor: tag.color, color: "#fff" }
                  : { backgroundColor: `${tag.color}22`, color: tag.color, border: `1px solid ${tag.color}55` }
              }
            >
              {tag.name}
            </button>
          ))}
          {activeTagFilter && (
            <button
              onClick={() => setActiveTagFilter(null)}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading
            ? "Loading..."
            : (search || selectedCategory || activeTagFilter)
            ? `${filteredProducts.length} of ${allProducts.length} products`
            : `${allProducts.length} products`}
        </p>
        <div className="flex items-center gap-3">
          {displayProducts.length > 0 && (
            <button
              onClick={() => {
                if (selectedIds.length === filteredProducts.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(filteredProducts.map((p) => p.id));
                }
              }}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {selectedIds.length === filteredProducts.length ? "Deselect All" : "Select All"}
            </button>
          )}
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid view"
              className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-accent/15 text-accent" : "text-muted hover:text-text hover:bg-white/5"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Table view"
              className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-accent/15 text-accent" : "text-muted hover:text-text hover:bg-white/5"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-9.75 0h9.75" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid / Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : displayProducts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h2 className="text-lg font-semibold mb-2">No Products Found</h2>
          <p className="text-muted text-sm max-w-md">
            {search
              ? "No products match your search. Try a different term."
              : "Sync your BigCommerce store to populate your product library."}
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                tags={allTags.filter((t) => (tagAssignments[product.id] || []).includes(t.id))}
                selected={selectedIds.includes(product.id)}
                onSelect={handleSelect}
                onClick={() => handleProductClick(product)}
                priceListPrice={selectedPriceListId && product.sku ? (priceMap[product.sku] ?? null) : null}
                priceListName={priceListName}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setVisibleCount((prev) => prev + 50)}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Show More ({filteredProducts.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.includes(p.id))}
                        onChange={() => {
                          if (filteredProducts.every((p) => selectedIds.includes(p.id))) {
                            setSelectedIds([]);
                          } else {
                            setSelectedIds(filteredProducts.map((p) => p.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 font-medium text-muted w-14">Image</th>
                    <th className="px-4 py-3 font-medium text-muted">Product</th>
                    <th className="px-4 py-3 font-medium text-muted">SKU</th>
                    <th className="px-4 py-3 font-medium text-muted">Brand</th>
                    <th className="px-4 py-3 font-medium text-muted w-28">Price</th>
                    <th className="px-4 py-3 font-medium text-muted w-20">Stock</th>
                    <th className="px-4 py-3 font-medium text-muted">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map((product) => {
                    const productTags = allTags.filter((t) => (tagAssignments[product.id] || []).includes(t.id));
                    const isSelected = selectedIds.includes(product.id);
                    return (
                      <tr
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className={`border-b border-border/50 hover:bg-white/[0.02] transition-colors cursor-pointer ${isSelected ? "bg-accent/[0.03]" : ""}`}
                      >
                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelect(product.id)}
                            className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2">
                          {product.primary_image_url ? (
                            <img
                              src={product.primary_image_url}
                              alt=""
                              className="w-10 h-10 object-contain rounded-lg bg-white/5"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                              <svg className="w-5 h-5 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium text-text truncate max-w-[260px]">{product.name}</div>
                          {product.claude_summary && (
                            <span className="text-[10px] text-accent/70">AI Summary</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted font-mono text-xs">{product.sku || "—"}</td>
                        <td className="px-4 py-2 text-muted text-xs">{product.brand_name || "—"}</td>
                        <td className="px-4 py-2">
                          <span className="font-semibold text-accent">${product.price.toFixed(2)}</span>
                          {product.sale_price > 0 && product.sale_price < product.price && (
                            <span className="ml-2 text-xs text-danger line-through">${product.sale_price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {product.inventory_level === 0 ? (
                            <span className="text-xs text-danger">Out of stock</span>
                          ) : (
                            <span className="text-xs text-muted">{product.inventory_level}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {productTags.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white leading-none"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setVisibleCount((prev) => prev + 50)}
                className="text-sm text-accent hover:text-accent/80 transition-colors"
              >
                Show More ({filteredProducts.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        descriptionLoading={detailLoading}
        allTags={allTags}
        productTags={
          detailProduct
            ? allTags.filter((t) => (tagAssignments[detailProduct.id] || []).includes(t.id))
            : []
        }
        tagsSaving={tagsSaving}
        onTagToggle={handleTagToggle}
        onTagCreate={handleTagCreate}
        onTagDelete={handleTagDelete}
      />
    </div>
  );
}
