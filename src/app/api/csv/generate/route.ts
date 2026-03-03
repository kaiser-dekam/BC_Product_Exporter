import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, resolveCredentials } from "@/lib/api-helpers";
import {
  fetchProducts,
  filterProducts,
  fetchBrandMap,
} from "@/lib/bigcommerce/client";
import { buildCsvContent } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  let body: {
    fields: string[];
    include_variants: boolean;
    include_unavailable: boolean;
    include_hidden: boolean;
    custom_domain: string;
    credentials?: {
      store_hash: string;
      client_id: string;
      access_token: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const {
    fields,
    include_variants,
    include_unavailable,
    include_hidden,
    custom_domain,
    credentials,
  } = body;

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json(
      { error: "fields must be a non-empty array" },
      { status: 400 }
    );
  }

  const resolved = await resolveCredentials(auth.user.uid, credentials);
  if (resolved.error) return resolved.error;

  try {
    const products = await fetchProducts(resolved.config, {
      includeVariants: include_variants,
    });

    const filtered = filterProducts(products, {
      includeUnavailable: include_unavailable,
      includeHidden: include_hidden,
    });

    const brandMap = await fetchBrandMap(resolved.config);

    const csvContent = buildCsvContent(
      filtered,
      fields,
      brandMap,
      custom_domain
    );

    const rowCount = filtered.length;
    const columnCount = fields.length;

    return NextResponse.json({
      csv_content: csvContent,
      row_count: rowCount,
      column_count: columnCount,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate CSV";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
