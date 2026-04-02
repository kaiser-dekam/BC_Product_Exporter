"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CategoryTreeSelect, { type CategoryNode } from "@/components/price-adjuster/CategoryTreeSelect";
import type { ProductVariant } from "@/app/(dashboard)/books/[bookId]/page";

interface PickerProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  cost_price?: number | null;
  primary_image_url: string;
  brand_name: string;
  claude_summary: string | null;
  variants?: ProductVariant[];
  user_description?: string | null;
  description_source?: "ai" | "custom";
  is_custom?: boolean;
  category_names?: string[];
}

interface ProductPickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (products: PickerProduct[]) => void;
  existingProductIds: string[];
}

// Module-level cache for picker products (shared across all instances)
let cachedProducts: PickerProduct[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 120_000; // 2 minutes

/** Invalidate the ProductPicker cache (call after sync or summarize) */
export function invalidatePickerCache() {
  cachedProducts = null;
  cacheTimestamp = 0;
}

function isCacheValid(): boolean {
  return cachedProducts !== null && Date.now() - cacheTimestamp < CACHE_TTL;
}

const EMPTY_CUSTOM_FORM = { name: "", sku: "", price: "", image_url: "", description: "" };

export default function ProductPicker({ open, onClose, onAdd, existingProductIds }: ProductPickerProps) {
  const { getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState<"catalog" | "category" | "custom">("catalog");
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Category tab state
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Custom product form state
  const [customForm, setCustomForm] = useState(EMPTY_CUSTOM_FORM);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Load ALL products (paginated) once, then cache client-side for search
  const fetchProducts = useCallback(async () => {
    if (isCacheValid()) {
      setProducts(cachedProducts!);
      return;
    }

    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const all: PickerProduct[] = [];
      let cursor = "";
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({ limit: "200", mode: "picker" });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/products?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) break;

        const data = await res.json();
        all.push(...(data.products as PickerProduct[]));
        cursor = data.next_cursor || "";
        hasMore = !!data.next_cursor;
      }

      setProducts(all);
      cachedProducts = all;
      cacheTimestamp = Date.now();
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Fetch category tree
  const fetchCategories = useCallback(async () => {
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
      // Silent fail
    } finally {
      setCategoriesLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchCategories();
      setSelected(new Set());
      setSearch("");
      setActiveTab("catalog");
      setSelectedCategory("");
      setCustomForm(EMPTY_CUSTOM_FORM);
      setCustomErrors({});
    }
  }, [open, fetchProducts, fetchCategories]);

  // Client-side search filtering (no API calls)
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [products, search]);

  const availableProducts = filteredProducts.filter(
    (p) => !existingProductIds.includes(p.id)
  );

  // Products filtered by selected category (excluding already-added)
  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(
      (p) =>
        p.category_names &&
        p.category_names.includes(selectedCategory) &&
        !existingProductIds.includes(p.id)
    );
  }, [products, selectedCategory, existingProductIds]);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddFromCatalog = () => {
    const selectedProducts = products.filter((p) => selected.has(p.id));
    onAdd(selectedProducts);
    onClose();
  };

  const handleAddFromCategory = () => {
    if (categoryProducts.length === 0) return;
    onAdd(categoryProducts);
    onClose();
  };

  const handleAddCustom = () => {
    const errors: Record<string, string> = {};
    if (!customForm.name.trim()) errors.name = "Name is required";
    const parsedPrice = parseFloat(customForm.price);
    if (!customForm.price || isNaN(parsedPrice) || parsedPrice < 0) errors.price = "Valid price is required";

    if (Object.keys(errors).length > 0) {
      setCustomErrors(errors);
      return;
    }

    const desc = customForm.description.trim();
    const customProduct: PickerProduct = {
      id: `custom_${Date.now()}`,
      name: customForm.name.trim(),
      sku: customForm.sku.trim(),
      price: parsedPrice,
      primary_image_url: customForm.image_url.trim(),
      brand_name: "",
      claude_summary: null,
      user_description: desc || null,
      description_source: desc ? "custom" : "ai",
      is_custom: true,
    };

    onAdd([customProduct]);
    onClose();
  };

  const updateCustomField = (field: keyof typeof customForm, value: string) => {
    setCustomForm((prev) => ({ ...prev, [field]: value }));
    if (customErrors[field]) {
      setCustomErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Products">
      <div className="space-y-4">
        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-surface/50 rounded-lg">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "catalog" ? "bg-accent text-[#0b0f1d] font-medium" : "text-muted hover:text-text"
            }`}
          >
            From Catalog
          </button>
          <button
            onClick={() => setActiveTab("category")}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "category" ? "bg-accent text-[#0b0f1d] font-medium" : "text-muted hover:text-text"
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "custom" ? "bg-accent text-[#0b0f1d] font-medium" : "text-muted hover:text-text"
            }`}
          >
            Create Custom
          </button>
        </div>

        {activeTab === "catalog" ? (
          <>
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-80 overflow-y-auto space-y-1">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted">Loading...</div>
              ) : availableProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">
                  {products.length === 0 ? "No products found. Sync your store first." : "All products already added."}
                </div>
              ) : (
                availableProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
                      selected.has(product.id)
                        ? "bg-accent/10 border border-accent/30"
                        : "bg-white/5 hover:bg-white/8 border border-transparent"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selected.has(product.id)
                        ? "bg-accent border-accent text-[#0b0f1d]"
                        : "border-white/30"
                    }`}>
                      {selected.has(product.id) && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {product.primary_image_url ? (
                        <img src={product.primary_image_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] text-muted">No img</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted">${product.price.toFixed(2)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleAddFromCatalog} disabled={selected.size === 0}>
                  Add Selected
                </Button>
              </div>
            </div>
          </>
        ) : activeTab === "category" ? (
          <>
            {/* Category selector */}
            <CategoryTreeSelect
              categories={categoryTree}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              loading={categoriesLoading}
            />

            {/* Preview of products in the selected category */}
            <div className="max-h-80 overflow-y-auto space-y-1">
              {!selectedCategory ? (
                <div className="py-8 text-center text-sm text-muted">
                  Select a category to see its products.
                </div>
              ) : loading ? (
                <div className="py-8 text-center text-sm text-muted">Loading...</div>
              ) : categoryProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted">
                  No available products in this category. They may already be added.
                </div>
              ) : (
                categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-transparent"
                  >
                    <div className="w-8 h-8 rounded bg-white/5 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {product.primary_image_url ? (
                        <img src={product.primary_image_url} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[8px] text-muted">No img</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted">{product.sku} &middot; ${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted">
                {selectedCategory
                  ? `${categoryProducts.length} product${categoryProducts.length !== 1 ? "s" : ""} in "${selectedCategory}"`
                  : "No category selected"}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleAddFromCategory} disabled={categoryProducts.length === 0}>
                  Add All ({categoryProducts.length})
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Custom product form */
          <div className="space-y-3">
            <Input
              label="Product Name *"
              value={customForm.name}
              onChange={(e) => updateCustomField("name", e.target.value)}
              error={customErrors.name}
              placeholder="Enter product name..."
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="SKU"
                value={customForm.sku}
                onChange={(e) => updateCustomField("sku", e.target.value)}
                placeholder="e.g. ABC-123"
              />
              <Input
                label="Price *"
                type="number"
                min="0"
                step="0.01"
                value={customForm.price}
                onChange={(e) => updateCustomField("price", e.target.value)}
                error={customErrors.price}
                placeholder="0.00"
              />
            </div>

            <Input
              label="Image URL"
              value={customForm.image_url}
              onChange={(e) => updateCustomField("image_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted font-medium">Description</label>
              <textarea
                value={customForm.description}
                onChange={(e) => updateCustomField("description", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-border text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors resize-none text-sm"
                rows={4}
                placeholder="Product description… (use - for bullet points)"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleAddCustom}>Add Custom Product</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
