"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface Product {
  product_cache_id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  claude_summary: string | null;
}

interface SectionEditorProps {
  id: string;
  title: string;
  products: Product[];
  onRemoveProduct: (sectionId: string, productCacheId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onRenameSection: (sectionId: string, newTitle: string) => void;
  onAddProducts: (sectionId: string) => void;
}

export default function SectionEditor({
  id,
  title,
  products,
  onRemoveProduct,
  onRemoveSection,
  onRenameSection,
  onAddProducts,
}: SectionEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-3">
          <button
            className="cursor-grab text-muted hover:text-text p-1"
            {...attributes}
            {...listeners}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => onRenameSection(id, e.target.value)}
            className="flex-1 bg-transparent border-none text-lg font-semibold focus:outline-none focus:ring-0 text-text"
            placeholder="Section title..."
          />

          <Button size="sm" variant="ghost" onClick={() => onAddProducts(id)}>
            + Add Products
          </Button>
          <Button size="sm" variant="danger" onClick={() => onRemoveSection(id)}>
            Remove
          </Button>
        </div>

        {/* Products list */}
        {products.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted border border-dashed border-border rounded-xl">
            No products in this section. Click &quot;+ Add Products&quot; to add some.
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.product_cache_id}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
              >
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
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted">
                    {product.sku && `SKU: ${product.sku} · `}${product.price.toFixed(2)}
                  </p>
                </div>

                {/* AI badge */}
                {product.claude_summary && (
                  <Badge variant="success" className="flex-shrink-0">AI</Badge>
                )}

                {/* Remove button */}
                <button
                  onClick={() => onRemoveProduct(id, product.product_cache_id)}
                  className="text-muted hover:text-danger transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
