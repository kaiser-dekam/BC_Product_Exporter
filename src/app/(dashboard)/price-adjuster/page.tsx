"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import CategoryTreeSelect, { type CategoryNode } from "@/components/price-adjuster/CategoryTreeSelect";
import BulkPriceControls from "@/components/price-adjuster/BulkPriceControls";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number;
  cost_price: number;
  primary_image_url: string;
  brand_name: string;
  category_names: string[];
}

interface PriceEdits {
  price?: number;
  sale_price?: number;
  cost_price?: number;
}

const PAGE_SIZE = 200;

export default function PriceAdjusterPage() {
  const { getIdToken } = useAuth();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Category tree
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Track edits as a map of product id -> changed fields
  const [edits, setEdits] = useState<Record<string, PriceEdits>>({});

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
      // Category tree is optional — filter still works without it
    } finally {
      setCategoriesLoading(false);
    }
  }, [getIdToken]);

  const fetchAllProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      let all: Product[] = [];
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

  const initialLoad = useRef(false);
  const categoriesLoaded = useRef(false);
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    fetchAllProducts();
  }, [fetchAllProducts]);

  useEffect(() => {
    if (categoriesLoaded.current) return;
    categoriesLoaded.current = true;
    fetchCategoryTree();
  }, [fetchCategoryTree]);

  const filteredProducts = useMemo(() => {
    let result = allProducts;

    if (selectedCategory) {
      result = result.filter(
        (p) => p.category_names && p.category_names.includes(selectedCategory)
      );
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
  }, [allProducts, search, selectedCategory]);

  const hasEdits = Object.keys(edits).length > 0;
  const editCount = Object.keys(edits).length;

  const handlePriceChange = useCallback(
    (productId: string, field: keyof PriceEdits, value: string, original: number) => {
      const numValue = value === "" ? 0 : parseFloat(value);
      if (isNaN(numValue)) return;

      setEdits((prev) => {
        const existing = prev[productId] || {};
        const updated = { ...existing, [field]: numValue };

        // Find the product to check all fields against originals
        const product = allProducts.find((p) => p.id === productId);
        if (!product) return prev;

        const originals: PriceEdits = {
          price: product.price,
          sale_price: product.sale_price,
          cost_price: product.cost_price,
        };

        // Remove field if it matches original
        if (numValue === original) {
          delete updated[field];
        }

        // Remove product entry if no edits remain
        const remainingFields = Object.keys(updated).filter(
          (k) => updated[k as keyof PriceEdits] !== originals[k as keyof PriceEdits]
        );

        if (remainingFields.length === 0) {
          const next = { ...prev };
          delete next[productId];
          return next;
        }

        return { ...prev, [productId]: updated };
      });
    },
    [allProducts]
  );

  const getDisplayValue = useCallback(
    (productId: string, field: keyof PriceEdits, original: number): string => {
      const edit = edits[productId];
      if (edit && edit[field] !== undefined) {
        return String(edit[field]);
      }
      return String(original);
    },
    [edits]
  );

  const isEdited = useCallback(
    (productId: string, field: keyof PriceEdits): boolean => {
      return edits[productId]?.[field] !== undefined;
    },
    [edits]
  );

  const handleSubmit = useCallback(async () => {
    if (!hasEdits) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const updates = Object.entries(edits).map(([id, fields]) => ({
        id,
        ...fields,
      }));

      const res = await fetch("/api/products/prices", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save prices");
      }

      const data = await res.json();

      if (data.errors?.length > 0) {
        setError(`Updated ${data.updated} products, but ${data.errors.length} failed`);
      } else {
        setSuccessMessage(`Successfully updated prices for ${data.updated} products`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }

      // Apply edits to local state and clear edits
      setAllProducts((prev) =>
        prev.map((p) => {
          const edit = edits[p.id];
          if (!edit) return p;
          return {
            ...p,
            price: edit.price ?? p.price,
            sale_price: edit.sale_price ?? p.sale_price,
            cost_price: edit.cost_price ?? p.cost_price,
          };
        })
      );
      setEdits({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prices");
    } finally {
      setSaving(false);
    }
  }, [hasEdits, edits, getIdToken]);

  const handleDiscard = useCallback(() => {
    setEdits({});
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allFilteredIds = filteredProducts.map((p) => p.id);
    const allSelected = allFilteredIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }, [filteredProducts, selectedIds]);

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(p.id));

  const handleBulkApply = useCallback(
    (options: {
      field: "price" | "sale_price" | "cost_price";
      mode: "amount" | "percentage";
      value: number;
      round: "none" | "up" | "down";
      roundTo: 1 | 5 | 10;
    }) => {
      setEdits((prev) => {
        const next = { ...prev };

        for (const product of allProducts) {
          if (!selectedIds.has(product.id)) continue;

          const existing = next[product.id] || {};
          const currentValue =
            existing[options.field] ?? product[options.field];

          let newValue: number;
          if (options.mode === "percentage") {
            newValue = currentValue * (1 + options.value / 100);
          } else {
            newValue = currentValue + options.value;
          }

          if (options.round !== "none") {
            const r = options.roundTo;
            if (options.round === "up") {
              newValue = Math.ceil(newValue / r) * r;
            } else {
              newValue = Math.floor(newValue / r) * r;
            }
          }

          newValue = Math.max(0, Math.round(newValue * 100) / 100);

          if (newValue === product[options.field]) {
            const updated = { ...existing };
            delete updated[options.field];
            if (Object.keys(updated).length === 0) {
              delete next[product.id];
            } else {
              next[product.id] = updated;
            }
          } else {
            next[product.id] = { ...existing, [options.field]: newValue };
          }
        }

        return next;
      });
    },
    [allProducts, selectedIds]
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Price Adjuster</h1>
          <p className="text-muted text-sm">
            View and edit product prices. Changes are saved when you click Submit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasEdits && (
            <Button variant="ghost" size="sm" onClick={handleDiscard}>
              Discard Changes
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={saving}
            disabled={!hasEdits}
          >
            Submit Changes{hasEdits ? ` (${editCount})` : ""}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}
      {successMessage && (
        <Card className="mb-4 border-success/30 bg-success/5">
          <p className="text-sm text-success">{successMessage}</p>
        </Card>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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
      </div>

      {/* Bulk Price Controls */}
      <div className="mb-4">
        <BulkPriceControls
          selectedCount={selectedIds.size}
          onApply={handleBulkApply}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading
            ? "Loading..."
            : search
            ? `${filteredProducts.length} matches out of ${allProducts.length} products`
            : `${allProducts.length} products`}
        </p>
        {hasEdits && (
          <p className="text-sm text-warning">
            {editCount} product{editCount !== 1 ? "s" : ""} modified
          </p>
        )}
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold mb-2">No Products Found</h2>
          <p className="text-muted text-sm max-w-md">
            {search
              ? "No products match your search. Try a different term."
              : "Sync your BigCommerce store first in the Product Library."}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium text-muted w-16">Image</th>
                  <th className="px-4 py-3 font-medium text-muted">Product</th>
                  <th className="px-4 py-3 font-medium text-muted">SKU</th>
                  <th className="px-4 py-3 font-medium text-muted w-36">Price</th>
                  <th className="px-4 py-3 font-medium text-muted w-36">Sale Price</th>
                  <th className="px-4 py-3 font-medium text-muted w-36">Cost Price</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b border-border/50 hover:bg-white/[0.02] transition-colors ${
                      edits[product.id] ? "bg-accent/[0.03]" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => handleToggleSelect(product.id)}
                        className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2">
                      {product.primary_image_url ? (
                        <img
                          src={product.primary_image_url}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg bg-white/5"
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
                      <div className="font-medium text-text truncate max-w-[250px]">{product.name}</div>
                      {product.brand_name && (
                        <div className="text-xs text-muted">{product.brand_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getDisplayValue(product.id, "price", product.price)}
                          onChange={(e) =>
                            handlePriceChange(product.id, "price", e.target.value, product.price)
                          }
                          className={`w-full pl-6 pr-2 py-1.5 rounded-lg text-right text-sm
                            bg-white/5 border transition-colors
                            focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                            ${isEdited(product.id, "price")
                              ? "border-warning/50 text-warning"
                              : "border-border text-text"
                            }`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getDisplayValue(product.id, "sale_price", product.sale_price)}
                          onChange={(e) =>
                            handlePriceChange(product.id, "sale_price", e.target.value, product.sale_price)
                          }
                          className={`w-full pl-6 pr-2 py-1.5 rounded-lg text-right text-sm
                            bg-white/5 border transition-colors
                            focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                            ${isEdited(product.id, "sale_price")
                              ? "border-warning/50 text-warning"
                              : "border-border text-text"
                            }`}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getDisplayValue(product.id, "cost_price", product.cost_price)}
                          onChange={(e) =>
                            handlePriceChange(product.id, "cost_price", e.target.value, product.cost_price)
                          }
                          className={`w-full pl-6 pr-2 py-1.5 rounded-lg text-right text-sm
                            bg-white/5 border transition-colors
                            focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                            ${isEdited(product.id, "cost_price")
                              ? "border-warning/50 text-warning"
                              : "border-border text-text"
                            }`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
