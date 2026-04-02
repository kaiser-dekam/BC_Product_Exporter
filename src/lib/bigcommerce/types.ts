export interface BigCommerceConfig {
  store_hash: string;
  client_id: string;
  access_token: string;
}

export interface BigCommerceProduct {
  id: number;
  name: string;
  sku: string;
  type: string;
  price: number;
  sale_price: number;
  retail_price: number;
  map_price: number;
  cost_price: number;
  msrp: number;
  tax_class_id: number;
  inventory_level: number;
  weight: number;
  width: number;
  height: number;
  depth: number;
  brand_id: number;
  upc: string;
  mpn: string;
  gtin: string;
  bin_picking_number: string;
  categories: number[];
  is_visible: boolean;
  is_featured: boolean;
  is_free_shipping: boolean;
  availability: string;
  availability_description: string;
  condition: string;
  description: string;
  warranty: string;
  search_keywords: string;
  date_created: string;
  date_modified: string;
  date_last_imported: string;
  total_sold: number;
  reviews_rating_sum: number;
  reviews_count: number;
  custom_url?: { url: string; is_customized: boolean };
  custom_fields?: Array<{ id: number; name: string; value: string }>;
  primary_image?: {
    url_standard: string;
    url_thumbnail: string;
    url_tiny: string;
  };
  images?: Array<{ url_standard: string }>;
  variants?: BigCommerceVariant[];
}

export interface BigCommerceVariant {
  id: number;
  product_id: number;
  sku: string;
  price: number | null;
  sale_price: number | null;
  cost_price: number | null;
  weight: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  inventory_level: number;
  upc: string;
  mpn: string;
  gtin: string;
  option_values?: Array<{ label: string; option_display_name: string }>;
}

export interface BigCommerceBrand {
  id: number;
  name: string;
}

export interface BigCommerceCategory {
  id: number;
  name: string;
  parent_id: number;
}
