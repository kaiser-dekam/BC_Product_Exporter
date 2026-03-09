export interface ProductCache {
  id: string;
  user_id: string;
  bigcommerce_product_id: number;
  name: string;
  sku: string;
  price: number;
  sale_price: number;
  cost_price: number;
  description: string;
  primary_image_url: string;
  image_urls: string[];
  brand_name: string;
  categories: number[];
  category_names: string[];
  inventory_level: number;
  is_visible: boolean;
  availability: string;
  weight: number;
  width: number;
  height: number;
  depth: number;
  custom_url: string;

  // Claude AI enrichment
  claude_summary: string | null;
  claude_specs: string | null;
  claude_weight_dims: string | null;
  claude_model_used: string | null;
  summarized_at: string | null;

  // Sync metadata
  synced_at: string;
  raw_data: Record<string, unknown>;
}
