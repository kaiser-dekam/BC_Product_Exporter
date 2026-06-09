// ---------------------------------------------------------------------------
// Google Sheets helpers
//
// Reads a Google Sheet that has been shared as "anyone with the link can view"
// (or published to the web) by hitting the public gviz CSV export endpoint.
// No OAuth is required for link-shared sheets.
// ---------------------------------------------------------------------------

/**
 * Extracts the spreadsheet id and (optional) sheet gid from a pasted Google
 * Sheets URL. Returns null if the URL doesn't look like a Sheets URL.
 */
export function parseSheetUrl(
  url: string,
): { spreadsheetId: string; gid: string | null } | null {
  if (!url) return null;

  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;

  const spreadsheetId = idMatch[1];

  // gid may appear in the hash (#gid=123) or query (?gid=123 / &gid=123)
  const gidMatch = url.match(/[#?&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : null;

  return { spreadsheetId, gid };
}

/**
 * Builds the public CSV export URL for a given spreadsheet id / gid.
 */
export function buildCsvExportUrl(spreadsheetId: string, gid: string | null): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`;
  const params = new URLSearchParams({ tqx: "out:csv" });
  if (gid) params.set("gid", gid);
  return `${base}?${params.toString()}`;
}

/**
 * Minimal RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes
 * ("") and both \n and \r\n line endings. Returns an array of rows.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Handle \r\n as a single line break
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  // Flush trailing field/row (file may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export interface SheetParseResult {
  /** sku (uppercased, trimmed) -> available stock */
  data: Record<string, number>;
  rowCount: number;
  /** Header names found in the sheet, useful for diagnostics */
  headers: string[];
}

/**
 * Normalizes a SKU for matching: trims, uppercases, and strips an optional
 * leading prefix (e.g. "DHM-") so a sheet SKU like "DHM-3122" matches a
 * BigCommerce SKU of "3122". Prefix matching is case-insensitive.
 */
export function normalizeSku(raw: string, prefix?: string): string {
  let sku = raw.trim().toUpperCase();
  const p = (prefix ?? "").trim().toUpperCase();
  if (p && sku.startsWith(p)) {
    sku = sku.slice(p.length).trim();
  }
  return sku;
}

/**
 * Fetches a Google Sheet's CSV and extracts a SKU -> available stock map.
 *
 * Column matching is case-insensitive and ignores surrounding whitespace.
 * `skuPrefix`, if set, is stripped from the start of each sheet SKU before
 * keying so the values line up with BigCommerce SKUs.
 */
export async function fetchSheetInventory(
  url: string,
  skuColumn: string,
  stockColumn: string,
  skuPrefix?: string,
): Promise<SheetParseResult> {
  const parsed = parseSheetUrl(url);
  if (!parsed) {
    throw new Error("Not a valid Google Sheets URL");
  }

  const csvUrl = buildCsvExportUrl(parsed.spreadsheetId, parsed.gid);

  const response = await fetch(csvUrl, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(
      `Could not read sheet (${response.status}). Make sure it is shared as "Anyone with the link can view".`,
    );
  }

  const text = await response.text();

  // A sign-in / permission page comes back as HTML, not CSV.
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error(
      'Sheet is not publicly readable. Set sharing to "Anyone with the link can view".',
    );
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { data: {}, rowCount: 0, headers: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const norm = (s: string) => s.trim().toLowerCase();

  const skuIdx = headers.findIndex((h) => norm(h) === norm(skuColumn));
  const stockIdx = headers.findIndex((h) => norm(h) === norm(stockColumn));

  if (skuIdx === -1) {
    throw new Error(`Column "${skuColumn}" not found. Found: ${headers.join(", ")}`);
  }
  if (stockIdx === -1) {
    throw new Error(`Column "${stockColumn}" not found. Found: ${headers.join(", ")}`);
  }

  const data: Record<string, number> = {};
  let rowCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const rawSku = (cells[skuIdx] ?? "").trim();
    if (!rawSku) continue;

    const sku = normalizeSku(rawSku, skuPrefix);
    if (!sku) continue;
    const rawStock = (cells[stockIdx] ?? "").trim().replace(/,/g, "");
    const stock = rawStock === "" ? 0 : Number(rawStock);

    data[sku] = Number.isFinite(stock) ? stock : 0;
    rowCount++;
  }

  return { data, rowCount, headers };
}
