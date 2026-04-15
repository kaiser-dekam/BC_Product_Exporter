import type {
  BigCommerceConfig,
  BigCommerceProduct,
  BigCommerceVariant,
  BigCommerceBrand,
  BigCommerceCategory,
  BigCommercePriceList,
  BigCommercePriceListRecord,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildHeaders(config: BigCommerceConfig): HeadersInit {
  return {
    "X-Auth-Client": config.client_id,
    "X-Auth-Token": config.access_token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function baseUrl(config: BigCommerceConfig): string {
  return `https://api.bigcommerce.com/stores/${config.store_hash}/v3`;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function fetchProducts(
  config: BigCommerceConfig,
  options: {
    maxItems?: number;
    pageSize?: number;
    includeVariants?: boolean;
  } = {},
): Promise<BigCommerceProduct[]> {
  const maxItems = options.maxItems ?? 2000;
  const pageSize = options.pageSize ?? 250;
  const includeVariants = options.includeVariants ?? false;

  const endpoint = `${baseUrl(config)}/catalog/products`;
  const headers = buildHeaders(config);

  const includeParams = ["images", "primary_image", "custom_fields"];
  if (includeVariants) {
    includeParams.push("options", "modifiers");
  }

  const allProducts: BigCommerceProduct[] = [];
  let page = 1;

  while (allProducts.length < maxItems) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
      include: includeParams.join(","),
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `BigCommerce API error (${response.status}): ${text}`,
      );
    }

    const payload = await response.json();
    const data: BigCommerceProduct[] = payload.data ?? [];

    if (data.length === 0) break;

    allProducts.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  const products = allProducts.slice(0, maxItems);

  if (includeVariants) {
    await Promise.all(
      products.map(async (product) => {
        product.variants = await fetchVariantsForProduct(
          product.id,
          config,
        );
      }),
    );
  }

  return products;
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export async function fetchVariantsForProduct(
  productId: number,
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<BigCommerceVariant[]> {
  const endpoint = `${baseUrl(config)}/catalog/products/${productId}/variants`;
  const headers = buildHeaders(config);

  const allVariants: BigCommerceVariant[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `BigCommerce API error (${response.status}): ${text}`,
      );
    }

    const payload = await response.json();
    const data: BigCommerceVariant[] = payload.data ?? [];

    if (data.length === 0) break;

    allVariants.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allVariants;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

const UNAVAILABLE_VALUES = new Set([
  "disabled",
  "unavailable",
  "no",
  "false",
  "0",
]);

export function filterProducts(
  products: BigCommerceProduct[],
  options: {
    includeUnavailable?: boolean;
    includeHidden?: boolean;
  } = {},
): BigCommerceProduct[] {
  const includeUnavailable = options.includeUnavailable ?? false;
  const includeHidden = options.includeHidden ?? false;

  return products.filter((product) => {
    const availability = String(product.availability ?? "").toLowerCase();
    const isVisible = product.is_visible ?? true;

    if (!includeUnavailable && UNAVAILABLE_VALUES.has(availability)) {
      return false;
    }
    if (!includeHidden && !isVisible) {
      return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export async function fetchBrandMap(
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<Record<number, string>> {
  const endpoint = `${baseUrl(config)}/catalog/brands`;
  const headers = buildHeaders(config);

  const brandMap: Record<number, string> = {};
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `BigCommerce API error (${response.status}): ${text}`,
      );
    }

    const payload = await response.json();
    const data: BigCommerceBrand[] = payload.data ?? [];

    if (data.length === 0) break;

    for (const brand of data) {
      brandMap[brand.id] = brand.name;
    }

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return brandMap;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function fetchCategories(
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<BigCommerceCategory[]> {
  const endpoint = `${baseUrl(config)}/catalog/categories`;
  const headers = buildHeaders(config);

  const allCategories: BigCommerceCategory[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `BigCommerce API error (${response.status}): ${text}`,
      );
    }

    const payload = await response.json();
    const data: BigCommerceCategory[] = payload.data ?? [];

    if (data.length === 0) break;

    allCategories.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allCategories;
}

export async function fetchCategoryMap(
  config: BigCommerceConfig,
): Promise<Record<number, string>> {
  const categories = await fetchCategories(config);
  const map: Record<number, string> = {};
  for (const cat of categories) {
    map[cat.id] = cat.name;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Price Lists
// ---------------------------------------------------------------------------

export async function fetchPriceLists(
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<BigCommercePriceList[]> {
  const endpoint = `${baseUrl(config)}/pricelists`;
  const headers = buildHeaders(config);
  const allLists: BigCommercePriceList[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BigCommerce Price Lists API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data: BigCommercePriceList[] = payload.data ?? [];

    if (data.length === 0) break;

    allLists.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allLists;
}

export async function fetchPriceListRecords(
  priceListId: number,
  config: BigCommerceConfig,
  options: { currency?: string; pageSize?: number } = {},
): Promise<BigCommercePriceListRecord[]> {
  const pageSize = options.pageSize ?? 250;
  const endpoint = `${baseUrl(config)}/pricelists/${priceListId}/records`;
  const headers = buildHeaders(config);
  const allRecords: BigCommercePriceListRecord[] = [];
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
    });
    if (options.currency) params.set("currency_code", options.currency);

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BigCommerce Price List Records API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data: BigCommercePriceListRecord[] = payload.data ?? [];

    if (data.length === 0) break;

    allRecords.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allRecords;
}
