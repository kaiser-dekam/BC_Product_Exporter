"use client";

import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

interface ProductDetailModalProps {
  product: {
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
  } | null;
  onClose: () => void;
  descriptionLoading?: boolean;
}

export default function ProductDetailModal({ product, onClose, descriptionLoading }: ProductDetailModalProps) {
  if (!product) return null;

  return (
    <Modal open={!!product} onClose={onClose} title={product.name}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Image */}
        {product.primary_image_url && (
          <div className="flex justify-center bg-white/5 rounded-xl p-4">
            <img
              src={product.primary_image_url}
              alt={product.name}
              className="max-h-48 object-contain"
            />
          </div>
        )}

        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted">SKU:</span>
            <span className="ml-2">{product.sku || "—"}</span>
          </div>
          <div>
            <span className="text-muted">Brand:</span>
            <span className="ml-2">{product.brand_name || "—"}</span>
          </div>
          <div>
            <span className="text-muted">Price:</span>
            <span className="ml-2 font-semibold text-accent">${product.price.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted">Sale Price:</span>
            <span className="ml-2">{product.sale_price > 0 ? `$${product.sale_price.toFixed(2)}` : "—"}</span>
          </div>
          <div>
            <span className="text-muted">Cost:</span>
            <span className="ml-2">{product.cost_price > 0 ? `$${product.cost_price.toFixed(2)}` : "—"}</span>
          </div>
          <div>
            <span className="text-muted">Stock:</span>
            <span className="ml-2">{product.inventory_level}</span>
          </div>
          <div>
            <span className="text-muted">Weight:</span>
            <span className="ml-2">{product.weight > 0 ? `${product.weight} lbs` : "—"}</span>
          </div>
          <div>
            <span className="text-muted">Dimensions:</span>
            <span className="ml-2">
              {product.width > 0 || product.height > 0 || product.depth > 0
                ? `${product.width} × ${product.height} × ${product.depth} in`
                : "—"}
            </span>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2 flex-wrap">
          {product.is_visible ? (
            <Badge variant="success">Visible</Badge>
          ) : (
            <Badge variant="warning">Hidden</Badge>
          )}
          <Badge variant={product.inventory_level > 0 ? "default" : "danger"}>
            {product.inventory_level > 0 ? "In Stock" : "Out of Stock"}
          </Badge>
          {product.claude_summary && <Badge variant="success">AI Summary</Badge>}
        </div>

        {/* AI Summary */}
        {product.claude_summary && (
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-semibold text-accent">AI Summary</span>
              {product.claude_model_used && (
                <span className="text-xs text-muted ml-auto">{product.claude_model_used}</span>
              )}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{product.claude_summary}</p>
          </div>
        )}

        {/* Description */}
        {descriptionLoading ? (
          <div>
            <h4 className="text-sm font-semibold text-muted mb-2">Original Description</h4>
            <div className="flex items-center gap-2 py-4 text-sm text-muted">
              <Spinner size="sm" />
              <span>Loading description...</span>
            </div>
          </div>
        ) : product.description ? (
          <div>
            <h4 className="text-sm font-semibold text-muted mb-2">Original Description</h4>
            <div
              className="text-sm text-muted/80 leading-relaxed max-h-40 overflow-y-auto prose prose-invert prose-sm"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
