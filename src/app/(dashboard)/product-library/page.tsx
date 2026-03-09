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

  // How many products to show (for "Show More" in filtered results)
  const [visibleCount, setVisibleCount] = useState(50);

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
  }, [fetchAllProducts, fetchSyncStatus]);

  // Client-side search filtering (no API calls)
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allProducts;
    return allProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [allProducts, search]);

  // Products to display (capped by visibleCount)
  const displayProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = filteredProducts.length > visibleCount;

  // Reset visible count when search changes
  useEffect(() => {
    setVisibleCount(50);
  }, [search]);

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
      />

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search products by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading
            ? "Loading..."
            : search
            ? `${filteredProducts.length} matches out of ${allProducts.length} products`
            : `${allProducts.length} products`}
        </p>
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
      </div>

      {/* Product Grid */}
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
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedIds.includes(product.id)}
                onSelect={handleSelect}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>

          {/* Show More button */}
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
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        descriptionLoading={detailLoading}
      />
    </div>
  );
}
