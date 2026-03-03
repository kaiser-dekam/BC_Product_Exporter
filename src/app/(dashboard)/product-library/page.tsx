"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import ProductCard from "@/components/product-library/ProductCard";
import SyncButton from "@/components/product-library/SyncButton";
import SummarizePanel from "@/components/product-library/SummarizePanel";
import ProductDetailModal from "@/components/product-library/ProductDetailModal";

interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number;
  cost_price: number;
  primary_image_url: string;
  brand_name: string;
  description: string;
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

export default function ProductLibraryPage() {
  const { getIdToken } = useAuth();

  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [total, setTotal] = useState(0);
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

  // Fetch products from cache
  const fetchProducts = useCallback(async (searchTerm = "") => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const params = new URLSearchParams({ limit: "200" });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load products");

      const data = await res.json();
      setProducts(data.products);
      setTotal(data.total);
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

  // Initial load
  useEffect(() => {
    fetchProducts();
    fetchSyncStatus();
  }, [fetchProducts, fetchSyncStatus]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      fetchProducts(search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchProducts]);

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

      // Refresh data
      await fetchProducts(search);
      await fetchSyncStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncLoading(false);
    }
  }, [getIdToken, fetchProducts, fetchSyncStatus, search]);

  // Toggle product selection
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

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

      // Refresh products to show updated summaries
      await fetchProducts(search);

      return { summarized: data.summarized, errors: data.errors || [] };
    },
    [getIdToken, fetchProducts, search]
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
          placeholder="Search products by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading ? "Loading..." : `Showing ${products.length} of ${total} products`}
        </p>
        {products.length > 0 && (
          <button
            onClick={() => {
              if (selectedIds.length === products.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(products.map((p) => p.id));
              }
            }}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            {selectedIds.length === products.length ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selected={selectedIds.includes(product.id)}
              onSelect={handleSelect}
              onClick={() => setDetailProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
      />
    </div>
  );
}
