"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface PickerProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  brand_name: string;
  claude_summary: string | null;
}

interface ProductPickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (products: PickerProduct[]) => void;
  existingProductIds: string[];
}

export default function ProductPicker({ open, onClose, onAdd, existingProductIds }: ProductPickerProps) {
  const { getIdToken } = useAuth();
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async (searchTerm = "") => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const params = new URLSearchParams({ limit: "100" });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (open) {
      fetchProducts();
      setSelected(new Set());
      setSearch("");
    }
  }, [open, fetchProducts]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => fetchProducts(search), 300);
    return () => clearTimeout(timeout);
  }, [search, open, fetchProducts]);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedProducts = products.filter((p) => selected.has(p.id));
    onAdd(selectedProducts);
    onClose();
  };

  const availableProducts = products.filter(
    (p) => !existingProductIds.includes(p.id)
  );

  return (
    <Modal open={open} onClose={onClose} title="Add Products">
      <div className="space-y-4">
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
            <Button size="sm" onClick={handleAdd} disabled={selected.size === 0}>
              Add Selected
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
