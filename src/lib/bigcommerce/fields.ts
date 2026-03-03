/**
 * Map of field keys to friendly labels for BigCommerce product export.
 * Ported from app.py FIELD_OPTIONS (lines 43-91).
 */
export const FIELD_OPTIONS: Record<string, string> = {
  id: "Product ID",
  name: "Name",
  sku: "SKU",
  price: "Price",
  sale_price: "Sale Price",
  retail_price: "Retail Price",
  map_price: "MAP Price",
  cost_price: "Cost Price",
  msrp: "MSRP",
  tax_class_id: "Tax Class ID",
  inventory_level: "Inventory",
  type: "Type",
  weight: "Weight",
  width: "Width",
  height: "Height",
  depth: "Depth",
  brand_id: "Brand ID",
  brand_name: "Brand Name",
  upc: "UPC",
  mpn: "MPN",
  gtin: "GTIN",
  bin_picking_number: "Bin Picking Number",
  categories: "Categories",
  category_ids: "Category IDs",
  primary_image_url: "Primary Image URL",
  thumbnail_url: "Thumbnail URL",
  image_urls: "Image URLs",
  is_visible: "Is Visible",
  is_featured: "Is Featured",
  is_free_shipping: "Is Free Shipping",
  availability: "Availability",
  availability_description: "Availability Description",
  condition: "Condition",
  description: "Description",
  warranty: "Warranty",
  search_keywords: "Search Keywords",
  custom_fields: "Custom Fields",
  date_created: "Date Created",
  date_modified: "Date Modified",
  date_last_imported: "Date Last Imported",
  total_sold: "Total Sold",
  reviews_rating_sum: "Reviews Rating Sum",
  reviews_count: "Reviews Count",
  variant_skus: "Variant SKUs",
  variant_prices: "Variant Prices",
  variants: "Variants (JSON)",
  custom_url: "Custom URL",
};

export const FIELD_KEYS = Object.keys(FIELD_OPTIONS);

/** Facebook Commerce Template preset fields in order. */
export const FACEBOOK_TEMPLATE_FIELDS = [
  "sku",
  "name",
  "description",
  "availability",
  "condition",
  "price",
  "custom_url",
  "primary_image_url",
  "brand_name",
  "inventory_level",
  "sale_price",
  "weight",
];

/** Default selected fields for a new export session. */
export const DEFAULT_SELECTED_FIELDS = ["name", "sku", "price"];
