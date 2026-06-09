"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import AddSheetModal from "@/components/inventory-tracker/AddSheetModal";
import AddStoreModal from "@/components/inventory-tracker/AddStoreModal";

interface InventoryLocation {
  id: number;
  code: string;
  label: string;
  enabled: boolean;
}

interface InventoryItem {
  sku: string;
  product_id: number | null;
  variant_id: number | null;
  name: string;
  primary_image_url: string;
  locations: Record<number, number>;
  total: number;
  inventory_tracking: string;
  tracked: boolean;
}

interface SheetSource {
  id: string;
  name: string;
  sheet_url: string;
  sku_column: string;
  stock_column: string;
  sku_prefix: string;
  data: Record<string, number>;
  row_count: number;
  error: string | null;
}

interface StoreSource {
  id: string;
  name: string;
  sku_prefix: string;
  data: Record<string, number>;
  item_count: number;
  error: string | null;
}

type SourceKind = "store" | "sheet";

// A unified comparison column derived from either a BigCommerce store or a sheet.
interface ColumnSource {
  /** Composite key, unique across kinds, e.g. "store:uuid" / "sheet:uuid" */
  key: string;
  /** The underlying row id, used for delete calls */
  id: string;
  kind: SourceKind;
  name: string;
  data: Record<string, number>;
  countLabel: string;
  error: string | null;
}

interface MergedRow {
  sku: string;
  name: string;
  primary_image_url: string;
  locations: Record<number, number>;
  total: number;
  /** source key -> value (undefined when the SKU is absent from that source) */
  sourceValues: Record<string, number | undefined>;
  hasMismatch: boolean;
  /**
   * True when the primary store's catalog has inventory_tracking set to
   * "product" or "variant" for this SKU. Source-only SKUs (not in the primary
   * store) are untracked.
   */
  tracked: boolean;
}

export default function InventoryTrackerPage() {
  const { getIdToken } = useAuth();

  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [sheets, setSheets] = useState<SheetSource[]>([]);
  const [stores, setStores] = useState<StoreSource[]>([]);

  const [loading, setLoading] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/bigcommerce/inventory", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load inventory");
      }

      const data = await res.json();
      setLocations(data.locations || []);
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  // Loads both extra-column source types (stores + sheets) in parallel.
  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const [storesRes, sheetsRes] = await Promise.all([
        fetch("/api/inventory/stores", { headers }),
        fetch("/api/inventory/sheets", { headers }),
      ]);

      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores || []);
      }
      if (sheetsRes.ok) {
        const data = await sheetsRes.json();
        setSheets(data.sheets || []);
      }
    } catch {
      // Sources are optional — the BigCommerce table still works without them
    } finally {
      setSourcesLoading(false);
    }
  }, [getIdToken]);

  const initialLoad = useRef(false);
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    fetchInventory();
    fetchSources();
  }, [fetchInventory, fetchSources]);

  const handleAddSheet = useCallback(
    async (sheet: {
      name: string;
      sheet_url: string;
      sku_column: string;
      stock_column: string;
      sku_prefix: string;
    }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/inventory/sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sheet),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add sheet");
      }

      await fetchSources();
    },
    [getIdToken, fetchSources],
  );

  const handleAddStore = useCallback(
    async (store: {
      name: string;
      store_hash: string;
      client_id: string;
      access_token: string;
      sku_prefix: string;
    }) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/inventory/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(store),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to add store");
      }

      await fetchSources();
    },
    [getIdToken, fetchSources],
  );

  const handleDeleteSource = useCallback(
    async (kind: SourceKind, id: string) => {
      const token = await getIdToken();
      if (!token) return;

      // Optimistic removal
      if (kind === "store") {
        setStores((prev) => prev.filter((s) => s.id !== id));
      } else {
        setSheets((prev) => prev.filter((s) => s.id !== id));
      }

      const path =
        kind === "store"
          ? `/api/inventory/stores/${id}`
          : `/api/inventory/sheets/${id}`;
      await fetch(path, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    [getIdToken],
  );

  const enabledLocations = useMemo(
    () => locations.filter((l) => l.enabled),
    [locations],
  );

  // Unified comparison columns: stores first, then sheets.
  const sources = useMemo<ColumnSource[]>(() => {
    const storeColumns: ColumnSource[] = stores.map((s) => ({
      key: `store:${s.id}`,
      id: s.id,
      kind: "store",
      name: s.name,
      data: s.data,
      countLabel: s.error ? "error" : `${s.item_count} SKUs`,
      error: s.error,
    }));
    const sheetColumns: ColumnSource[] = sheets.map((s) => ({
      key: `sheet:${s.id}`,
      id: s.id,
      kind: "sheet",
      name: s.name,
      data: s.data,
      countLabel: s.error ? "error" : `${s.row_count} rows`,
      error: s.error,
    }));
    return [...storeColumns, ...sheetColumns];
  }, [stores, sheets]);

  // Merge primary BigCommerce inventory with each source column, keyed by SKU.
  const mergedRows = useMemo<MergedRow[]>(() => {
    const bySku = new Map<string, MergedRow>();

    for (const item of items) {
      bySku.set(item.sku, {
        sku: item.sku,
        name: item.name,
        primary_image_url: item.primary_image_url,
        locations: item.locations,
        total: item.total,
        sourceValues: {},
        hasMismatch: false,
        tracked: item.tracked,
      });
    }

    // Pull in SKUs that exist only in a source (not in the primary store)
    for (const source of sources) {
      for (const sku of Object.keys(source.data)) {
        if (!bySku.has(sku)) {
          bySku.set(sku, {
            sku,
            name: "",
            primary_image_url: "",
            locations: {},
            total: 0,
            sourceValues: {},
            hasMismatch: false,
            tracked: false,
          });
        }
      }
    }

    for (const row of bySku.values()) {
      let mismatch = false;
      for (const source of sources) {
        const value = source.data[row.sku];
        row.sourceValues[source.key] = value;
        if (value !== undefined && value !== row.total) {
          mismatch = true;
        }
      }
      row.hasMismatch = mismatch;
    }

    return Array.from(bySku.values()).sort((a, b) => {
      const an = a.name || a.sku;
      const bn = b.name || b.sku;
      return an.localeCompare(bn);
    });
  }, [items, sources]);

  const filteredRows = useMemo(() => {
    let result = mergedRows;

    if (trackedOnly) {
      result = result.filter((r) => r.tracked);
    }

    if (mismatchOnly) {
      result = result.filter((r) => r.hasMismatch);
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter(
        (r) =>
          r.sku.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term),
      );
    }

    return result;
  }, [mergedRows, search, mismatchOnly, trackedOnly]);

  const mismatchCount = useMemo(
    () => mergedRows.filter((r) => r.hasMismatch).length,
    [mergedRows],
  );

  const untrackedCount = useMemo(
    () => mergedRows.filter((r) => !r.tracked).length,
    [mergedRows],
  );

  const sourcesWithError = useMemo(
    () => sources.filter((s) => s.error),
    [sources],
  );

  // Split for grouped column rendering. The default BigCommerce connection
  // (per-location columns + BC Total) and any added stores live under "Stores";
  // sheets live under "Google Sheets".
  const storeSources = useMemo(
    () => sources.filter((s) => s.kind === "store"),
    [sources],
  );
  const sheetSources = useMemo(
    () => sources.filter((s) => s.kind === "sheet"),
    [sources],
  );

  // Column count for the "Stores" group header: per-location cols + BC Total +
  // any added store columns.
  const storesGroupSpan = enabledLocations.length + 1 + storeSources.length;
  const showGroupHeader = sources.length > 0;

  // Cell styling for a source value compared against the BigCommerce total.
  const sourceCellClass = (value: number | undefined, bcTotal: number): string => {
    if (value === undefined) return "text-muted/40";
    if (value === bcTotal) return "text-success";
    return value > bcTotal
      ? "text-warning font-semibold"
      : "text-danger font-semibold";
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Inventory Tracker</h1>
          <p className="text-muted text-sm">
            Compare live BigCommerce inventory across your locations against other
            BigCommerce stores and the stock counts your team keeps in Google
            Sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={() => setStoreModalOpen(true)}>
            + Add Store
          </Button>
          <Button variant="secondary" size="md" onClick={() => setSheetModalOpen(true)}>
            + Add Sheet
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              fetchInventory();
              fetchSources();
            }}
            loading={loading || sourcesLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger whitespace-pre-wrap">{error}</p>
        </Card>
      )}

      {/* Source chips */}
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-muted">Sources:</span>
          {sources.map((source) => (
            <div
              key={source.key}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
                source.error
                  ? "border-danger/40 bg-danger/5 text-danger"
                  : "border-border bg-white/5 text-text"
              }`}
              title={source.error || source.countLabel}
            >
              <span
                className={`text-[10px] uppercase tracking-wide ${
                  source.kind === "store" ? "text-accent" : "text-muted"
                }`}
              >
                {source.kind === "store" ? "Store" : "Sheet"}
              </span>
              <span className="font-medium">{source.name}</span>
              <span className="text-muted">{source.countLabel}</span>
              <button
                onClick={() => handleDeleteSource(source.kind, source.id)}
                className="text-muted hover:text-danger transition-colors"
                aria-label={`Remove ${source.name}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Per-source error detail */}
      {sourcesWithError.length > 0 && (
        <Card className="mb-4 border-warning/30 bg-warning/5">
          <p className="text-xs font-medium text-warning mb-1">
            Some sources could not be read:
          </p>
          <ul className="text-xs text-muted list-disc list-inside space-y-0.5">
            {sourcesWithError.map((s) => (
              <li key={s.key}>
                <span className="text-text">{s.name}</span>: {s.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label
          className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none px-1"
          title="Only show products that have inventory tracking enabled in BigCommerce"
        >
          <input
            type="checkbox"
            checked={trackedOnly}
            onChange={(e) => setTrackedOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
          />
          Tracking on only
          {untrackedCount > 0 && (
            <span className="text-muted/60">(hides {untrackedCount})</span>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none px-1">
          <input
            type="checkbox"
            checked={mismatchOnly}
            onChange={(e) => setMismatchOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-white/5 accent-accent cursor-pointer"
          />
          Mismatches only
          {mismatchCount > 0 && (
            <span className="text-warning">({mismatchCount})</span>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">
          {loading
            ? "Loading inventory..."
            : `${filteredRows.length} of ${mergedRows.length} products`}
        </p>
        {!loading && enabledLocations.length === 0 && (
          <p className="text-sm text-warning">
            No enabled BigCommerce locations found
          </p>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredRows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="w-12 h-12 text-muted/30 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
            />
          </svg>
          <h2 className="text-lg font-semibold mb-2">No Inventory Found</h2>
          <p className="text-muted text-sm max-w-md">
            {search || mismatchOnly || trackedOnly
              ? "No products match the current filters."
              : "Make sure your BigCommerce store has the Multi-Location Inventory API enabled and that products have inventory tracking turned on."}
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {showGroupHeader && (
                  <tr className="border-b border-border/60 text-left">
                    <th className="px-4 py-2" colSpan={3} />
                    <th
                      colSpan={storesGroupSpan}
                      className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent text-center border-l border-border"
                    >
                      Stores
                    </th>
                    {sheetSources.length > 0 && (
                      <th
                        colSpan={sheetSources.length}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-success text-center border-l border-border"
                      >
                        Google Sheets
                      </th>
                    )}
                  </tr>
                )}
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted w-16">Image</th>
                  <th className="px-4 py-3 font-medium text-muted">Product</th>
                  <th className="px-4 py-3 font-medium text-muted">SKU</th>
                  {enabledLocations.map((loc, idx) => (
                    <th
                      key={loc.id}
                      className={`px-4 py-3 font-medium text-muted text-right whitespace-nowrap ${
                        idx === 0 ? "border-l border-border" : ""
                      }`}
                      title={loc.code}
                    >
                      {loc.label || loc.code}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-text text-right whitespace-nowrap border-l border-border">
                    BC Total
                  </th>
                  {storeSources.map((source) => (
                    <th
                      key={source.key}
                      className="px-4 py-3 font-medium text-accent text-right whitespace-nowrap"
                      title="BigCommerce store"
                    >
                      {source.name}
                    </th>
                  ))}
                  {sheetSources.map((source, idx) => (
                    <th
                      key={source.key}
                      className={`px-4 py-3 font-medium text-accent text-right whitespace-nowrap ${
                        idx === 0 ? "border-l border-border" : ""
                      }`}
                      title="Google Sheet"
                    >
                      {source.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.sku}
                    className={`border-b border-border/50 hover:bg-white/[0.02] transition-colors ${
                      row.hasMismatch ? "bg-warning/[0.04]" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      {row.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.primary_image_url}
                          alt=""
                          className="w-10 h-10 object-cover rounded-lg bg-white/5"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-muted/30"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                            />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-medium text-text truncate max-w-[260px]">
                        {row.name || (
                          <span className="text-muted italic">Not in catalog</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted font-mono text-xs">
                      {row.sku}
                    </td>
                    {enabledLocations.map((loc, idx) => (
                      <td
                        key={loc.id}
                        className={`px-4 py-2 text-right tabular-nums text-text ${
                          idx === 0 ? "border-l border-border" : ""
                        }`}
                      >
                        {row.locations[loc.id] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-text border-l border-border">
                      {row.total}
                    </td>
                    {storeSources.map((source) => {
                      const value = row.sourceValues[source.key];
                      return (
                        <td
                          key={source.key}
                          className={`px-4 py-2 text-right tabular-nums ${sourceCellClass(
                            value,
                            row.total,
                          )}`}
                        >
                          {value === undefined ? "—" : value}
                        </td>
                      );
                    })}
                    {sheetSources.map((source, idx) => {
                      const value = row.sourceValues[source.key];
                      return (
                        <td
                          key={source.key}
                          className={`px-4 py-2 text-right tabular-nums ${
                            idx === 0 ? "border-l border-border" : ""
                          } ${sourceCellClass(value, row.total)}`}
                        >
                          {value === undefined ? "—" : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      {sources.length > 0 && filteredRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted">
          <span>Source vs. BC Total:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" /> match
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" /> source
            higher
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> source
            lower
          </span>
          <span className="text-muted/60">— = SKU not in source</span>
        </div>
      )}

      <AddStoreModal
        open={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        onAdd={handleAddStore}
      />
      <AddSheetModal
        open={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        onAdd={handleAddSheet}
      />
    </div>
  );
}
