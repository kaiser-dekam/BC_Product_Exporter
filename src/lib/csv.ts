import Papa from "papaparse";
import { FIELD_OPTIONS } from "./bigcommerce/fields";
import type { BigCommerceProduct } from "./bigcommerce/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyDomain(domain: string, urlValue: unknown): string {
  if (!domain) return String(urlValue ?? "");
  if (!urlValue) return "";
  const str = String(urlValue);
  if (str.startsWith("http://") || str.startsWith("https://")) return str;
  const domainClean = domain.replace(/\/+$/, "");
  const path = str.startsWith("/") ? str : `/${str}`;
  return `${domainClean}${path}`;
}

// ---------------------------------------------------------------------------
// Field value extraction
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function extractFieldValue(
  product: BigCommerceProduct,
  field: string,
  brandMap: Record<number, string>,
  customDomain: string,
): string {
  switch (field) {
    case "primary_image_url":
      return product.primary_image?.url_standard ?? "";

    case "thumbnail_url":
      return product.primary_image?.url_thumbnail ?? "";

    case "image_urls":
      return (product.images ?? [])
        .map((img) => img.url_standard)
        .join(", ");

    case "brand_name":
      return brandMap[product.brand_id] ?? "";

    case "category_ids":
      return (product.categories ?? []).join(", ");

    case "custom_fields":
      return (product.custom_fields ?? [])
        .map((cf) => `${cf.name}: ${cf.value}`)
        .join("; ");

    case "variant_skus":
      return (product.variants ?? []).map((v) => v.sku).join(", ");

    case "variant_prices":
      return (product.variants ?? [])
        .map((v) => (v.price != null ? String(v.price) : ""))
        .join(", ");

    case "variants":
      return JSON.stringify(product.variants ?? []);

    case "custom_url": {
      const rawUrl =
        typeof product.custom_url === "object" && product.custom_url !== null
          ? (product.custom_url as { url?: string }).url ?? ""
          : "";
      return applyDomain(customDomain, rawUrl);
    }

    default: {
      const value = (product as any)[field];
      if (value == null) return "";
      if (Array.isArray(value)) return value.join(", ");
      if (typeof value === "object") {
        // Extract url if present, otherwise stringify
        if ("url" in value) return String(value.url ?? "");
        return JSON.stringify(value);
      }
      return String(value);
    }
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// CSV builder
// ---------------------------------------------------------------------------

export function buildCsvContent(
  products: BigCommerceProduct[],
  fields: string[],
  brandMap: Record<number, string>,
  customDomain = "",
): string {
  const headerRow = fields.map(
    (field) => FIELD_OPTIONS[field] ?? field,
  );

  const dataRows = products.map((product) =>
    fields.map((field) =>
      extractFieldValue(product, field, brandMap, customDomain),
    ),
  );

  return Papa.unparse({
    fields: headerRow,
    data: dataRows,
  });
}
