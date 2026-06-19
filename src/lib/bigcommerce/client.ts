import type {
  BigCommerceConfig,
  BigCommerceProduct,
  BigCommerceVariant,
  BigCommerceBrand,
  BigCommerceCategory,
  BigCommerceLocation,
  BigCommerceInventoryItem,
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
// Inventory locations (Multi-Location Inventory API)
// ---------------------------------------------------------------------------

export async function fetchInventoryLocations(
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<BigCommerceLocation[]> {
  const endpoint = `${baseUrl(config)}/inventory/locations`;
  const headers = buildHeaders(config);

  const allLocations: BigCommerceLocation[] = [];
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
      throw new Error(`BigCommerce API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data: BigCommerceLocation[] = payload.data ?? [];

    if (data.length === 0) break;

    allLocations.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allLocations;
}

export async function fetchInventoryTrackingMap(
  config: BigCommerceConfig,
  pageSize = 250,
): Promise<Record<number, string>> {
  const endpoint = `${baseUrl(config)}/catalog/products`;
  const headers = buildHeaders(config);

  const map: Record<number, string> = {};
  let page = 1;

  while (true) {
    const params = new URLSearchParams({
      limit: String(pageSize),
      page: String(page),
      include_fields: "inventory_tracking",
    });

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`BigCommerce API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data: Array<{ id: number; inventory_tracking?: string }> =
      payload.data ?? [];

    if (data.length === 0) break;

    for (const product of data) {
      map[product.id] = product.inventory_tracking ?? "none";
    }

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return map;
}

export async function fetchInventoryItems(
  config: BigCommerceConfig,
  options: { maxItems?: number; pageSize?: number } = {},
): Promise<BigCommerceInventoryItem[]> {
  const maxItems = options.maxItems ?? 10_000;
  const pageSize = options.pageSize ?? 250;

  const endpoint = `${baseUrl(config)}/inventory/items`;
  const headers = buildHeaders(config);

  const allItems: BigCommerceInventoryItem[] = [];
  let page = 1;

  while (allItems.length < maxItems) {
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
      throw new Error(`BigCommerce API error (${response.status}): ${text}`);
    }

    const payload = await response.json();
    const data: BigCommerceInventoryItem[] = payload.data ?? [];

    if (data.length === 0) break;

    allItems.push(...data);

    const pagination = payload.meta?.pagination ?? {};
    const totalPages: number | undefined = pagination.total_pages;
    const currentPage: number = pagination.current_page ?? page;

    if (totalPages !== undefined && currentPage >= totalPages) break;
    if (totalPages === undefined && data.length < pageSize) break;

    page += 1;
  }

  return allItems.slice(0, maxItems);
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

// ---------------------------------------------------------------------------
// Price updates
// ---------------------------------------------------------------------------

export async function updateProductPrice(
  update: {
    id: number;
    price?: number;
    sale_price?: number;
    cost_price?: number;
  },
  config: BigCommerceConfig,
): Promise<{ error: string | null; notFound: boolean }> {
  const { id, ...fields } = update;
  const endpoint = `${baseUrl(config)}/catalog/products/${id}`;
  const headers = buildHeaders(config);

  const response = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify(fields),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      error: `BC product ${id}: ${response.status} ${text}`,
      notFound: response.status === 404,
    };
  }

  return { error: null, notFound: false };
}

export async function findProductIdBySku(
  sku: string,
  config: BigCommerceConfig,
): Promise<number | null> {
  if (!sku) return null;

  const endpoint = `${baseUrl(config)}/catalog/products`;
  const headers = buildHeaders(config);
  const params = new URLSearchParams({ sku, limit: "1" });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const data = payload.data ?? [];
  return data.length > 0 ? (data[0].id as number) : null;
}
