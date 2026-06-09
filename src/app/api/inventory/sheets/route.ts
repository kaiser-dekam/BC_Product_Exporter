import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchSheetInventory, parseSheetUrl } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

interface SheetRow {
  id: string;
  name: string;
  sheet_url: string;
  sku_column: string;
  stock_column: string;
  sku_prefix: string;
  sort_order: number;
}

// GET /api/inventory/sheets
// Returns each configured Google Sheet plus its current parsed contents
// (a SKU -> available stock map). Each sheet is fetched in parallel; a failure
// to read one sheet is reported per-sheet via an `error` field rather than
// failing the whole request.
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const { data: sheets, error } = await supabase
    .from("inventory_sheets")
    .select("id, name, sheet_url, sku_column, stock_column, sku_prefix, sort_order")
    .eq("user_id", auth.user.uid)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.all(
    (sheets ?? []).map(async (sheet: SheetRow) => {
      try {
        const parsed = await fetchSheetInventory(
          sheet.sheet_url,
          sheet.sku_column,
          sheet.stock_column,
          sheet.sku_prefix,
        );
        return {
          ...sheet,
          data: parsed.data,
          row_count: parsed.rowCount,
          error: null as string | null,
        };
      } catch (err) {
        return {
          ...sheet,
          data: {} as Record<string, number>,
          row_count: 0,
          error: err instanceof Error ? err.message : "Failed to read sheet",
        };
      }
    }),
  );

  return NextResponse.json({ sheets: results });
}

// POST /api/inventory/sheets — add a new Google Sheet source
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const sheet_url = body?.sheet_url?.trim();
  const sku_column = body?.sku_column?.trim() || "SKU";
  const stock_column = body?.stock_column?.trim() || "Available Stock";
  const sku_prefix = body?.sku_prefix?.trim() || "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!sheet_url || !parseSheetUrl(sheet_url)) {
    return NextResponse.json(
      { error: "A valid Google Sheets URL is required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Place new sheets at the end of the current ordering
  const { count } = await supabase
    .from("inventory_sheets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.uid);

  const { data, error } = await supabase
    .from("inventory_sheets")
    .insert({
      user_id: auth.user.uid,
      name,
      sheet_url,
      sku_column,
      stock_column,
      sku_prefix,
      sort_order: count ?? 0,
    })
    .select("id, name, sheet_url, sku_column, stock_column, sku_prefix, sort_order")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sheet: data }, { status: 201 });
}
