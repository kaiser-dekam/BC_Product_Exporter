"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    sale_price: number;
    primary_image_url: string;
    brand_name: string;
    inventory_level: number;
    is_visible: boolean;
    availability: string;
    claude_summary: string | null;
  };
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: () => void;
  priceListPrice?: number | null;
  priceListName?: string;
}

export default function ProductCard({ product, selected, onSelect, onClick, priceListPrice, priceListName }: ProductCardProps) {
  const hasImage = !!product.primary_image_url;
  const hasSummary = !!product.claude_summary;

  return (
    <Card
      className={`flex flex-col h-full overflow-hidden p-0 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg ${
        selected ? "ring-2 ring-accent border-accent/50" : ""
      }`}
      onClick={onClick}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product.id);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              selected
                ? "bg-accent border-accent text-[#0b0f1d]"
                : "bg-black/40 border-white/30 hover:border-white/60"
            }`}
          >
            {selected && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden relative">
        {hasImage ? (
          <img
            src={product.primary_image_url}
            alt={product.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <svg className="w-12 h-12 text-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{product.name}</h3>

        {product.brand_name && (
          <p className="text-xs text-muted">{product.brand_name}</p>
        )}

        <div className="flex items-center gap-2 mt-auto flex-wrap">
          <span className="text-base font-bold text-accent">
            ${product.price.toFixed(2)}
          </span>
          {product.sale_price > 0 && product.sale_price < product.price && (
            <span className="text-xs text-danger line-through">
              ${product.sale_price.toFixed(2)}
            </span>
          )}
          {priceListPrice != null && (
            <span className="text-xs font-medium text-warning" title={priceListName ? `${priceListName} price` : "Price list price"}>
              {priceListName ? `${priceListName}: ` : "List: "}${priceListPrice.toFixed(2)}
            </span>
          )}
        </div>

        {product.sku && (
          <p className="text-xs text-muted">SKU: {product.sku}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-1">
          {hasSummary && (
            <Badge variant="success">AI Summary</Badge>
          )}
          {!product.is_visible && (
            <Badge variant="warning">Hidden</Badge>
          )}
          {product.inventory_level === 0 && (
            <Badge variant="danger">Out of Stock</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
