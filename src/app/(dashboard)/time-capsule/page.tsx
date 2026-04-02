"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

interface Snapshot {
  id: string;
  label: string;
  product_count: number;
  created_at: string;
}

interface SnapshotItem {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  sale_price: number;
  cost_price: number;
  description: string;
}

const PAGE_SIZE = 25;

export default function TimeCapsulePage() {
  const { getIdToken } = useAuth();

  // Snapshots
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  // Items
  const [items, setItems] = useState<SnapshotItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Description modal
  const [descriptionModal, setDescriptionModal] = useState<{
    name: string;
    description: string;
  } | null>(null);

  // Rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch snapshots
  const fetchSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/snapshots", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load backups");

      const data = await res.json();
      const snaps = data.snapshots || [];
      setSnapshots(snaps);

      // Auto-select the most recent snapshot
      if (snaps.length > 0 && !activeSnapshotId) {
        setActiveSnapshotId(snaps[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load backups");
    } finally {
      setSnapshotsLoading(false);
    }
  }, [getIdToken, activeSnapshotId]);

  // Fetch snapshot items
  const fetchItems = useCallback(async () => {
    if (!activeSnapshotId) return;

    setItemsLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(
        `/api/snapshots/${activeSnapshotId}/items?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to load snapshot data");

      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load snapshot data");
    } finally {
      setItemsLoading(false);
    }
  }, [getIdToken, activeSnapshotId, page, debouncedSearch]);

  // Initial load
  const initialLoad = useRef(false);
  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Fetch items when active snapshot, page, or search changes
  useEffect(() => {
    if (activeSnapshotId) {
      fetchItems();
    }
  }, [activeSnapshotId, page, debouncedSearch, fetchItems]);

  // Create backup
  const handleCreateBackup = useCallback(async () => {
    setBackupLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to create backup");
      }

      const data = await res.json();
      const newSnapshot = data.snapshot;

      setSnapshots((prev) => [newSnapshot, ...prev]);
      setActiveSnapshotId(newSnapshot.id);
      setPage(1);
      setSearch("");
      setSuccessMessage(
        `Backup created with ${newSnapshot.product_count} products`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setBackupLoading(false);
    }
  }, [getIdToken]);

  // Switch snapshot tab
  const handleSelectSnapshot = useCallback((id: string) => {
    setActiveSnapshotId(id);
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
  }, []);

  // Delete snapshot
  const handleDeleteSnapshot = useCallback(
    async (id: string) => {
      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await fetch(`/api/snapshots/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete backup");

        setSnapshots((prev) => {
          const updated = prev.filter((s) => s.id !== id);
          if (activeSnapshotId === id) {
            setActiveSnapshotId(updated.length > 0 ? updated[0].id : null);
            setItems([]);
          }
          return updated;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete backup");
      }
    },
    [getIdToken, activeSnapshotId]
  );

  // Start rename
  const handleStartRename = useCallback((snap: Snapshot) => {
    setEditingId(snap.id);
    setEditingLabel(snap.label);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }, []);

  // Save rename
  const handleSaveRename = useCallback(
    async (id: string) => {
      const trimmed = editingLabel.trim();
      if (!trimmed) {
        setEditingId(null);
        return;
      }

      // Skip API call if unchanged
      const snap = snapshots.find((s) => s.id === id);
      if (snap && snap.label === trimmed) {
        setEditingId(null);
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) return;

        const res = await fetch(`/api/snapshots/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ label: trimmed }),
        });

        if (!res.ok) throw new Error("Failed to rename backup");

        setSnapshots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, label: trimmed } : s))
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename backup");
      } finally {
        setEditingId(null);
      }
    },
    [editingLabel, snapshots, getIdToken]
  );

  // Format price
  const formatPrice = (value: number) =>
    `$${Number(value).toFixed(2)}`;

  // Pagination info
  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Time Capsule</h1>
          <p className="text-muted text-sm">
            Snapshot your product data and browse historical backups.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleCreateBackup}
          loading={backupLoading}
        >
          Create Backup
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}
      {successMessage && (
        <Card className="mb-4 border-success/30 bg-success/5">
          <p className="text-sm text-success">{successMessage}</p>
        </Card>
      )}

      {/* Snapshot Tabs */}
      {snapshotsLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : snapshots.length === 0 ? (
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
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-lg font-semibold mb-2">No Backups Yet</h2>
          <p className="text-muted text-sm max-w-md">
            Click Create Backup to snapshot your current product data. You can
            then browse and compare historical data anytime.
          </p>
        </Card>
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-1">
              {snapshots.map((snap) => (
                <div key={snap.id} className="relative group">
                  {editingId === snap.id ? (
                    <input
                      ref={renameInputRef}
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      onBlur={() => handleSaveRename(snap.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(snap.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-sm font-medium bg-white/10 border border-accent/50
                        text-text focus:outline-none focus:ring-1 focus:ring-accent/30 w-48"
                    />
                  ) : (
                    <button
                      onClick={() => handleSelectSnapshot(snap.id)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        handleStartRename(snap);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap
                        ${
                          activeSnapshotId === snap.id
                            ? "bg-accent/10 text-accent border border-accent/30"
                            : "bg-white/5 text-muted border border-border hover:text-text hover:bg-white/10"
                        }`}
                      title="Double-click to rename"
                    >
                      <span>{snap.label}</span>
                      <span className="ml-2 text-xs opacity-60">
                        ({snap.product_count})
                      </span>
                    </button>
                  )}
                  {/* Delete button on hover */}
                  {editingId !== snap.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSnapshot(snap.id);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger/80 text-white text-xs
                        flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                        hover:bg-danger"
                      title="Delete backup"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {itemsLoading
                ? "Loading..."
                : total > 0
                ? `Showing ${startItem}–${endItem} of ${total} products`
                : "No products found"}
            </p>
          </div>

          {/* Product Table */}
          {itemsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : items.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <h2 className="text-lg font-semibold mb-2">No Products Found</h2>
              <p className="text-muted text-sm">
                {debouncedSearch
                  ? "No products match your search. Try a different term."
                  : "This backup contains no products."}
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-4 py-3 font-medium text-muted">
                        Product
                      </th>
                      <th className="px-4 py-3 font-medium text-muted">SKU</th>
                      <th className="px-4 py-3 font-medium text-muted w-28">
                        Price
                      </th>
                      <th className="px-4 py-3 font-medium text-muted w-28">
                        Sale Price
                      </th>
                      <th className="px-4 py-3 font-medium text-muted w-28">
                        Cost Price
                      </th>
                      <th className="px-4 py-3 font-medium text-muted w-28">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-2">
                          <div className="font-medium text-text truncate max-w-[300px]">
                            {item.name}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-muted font-mono text-xs">
                          {item.sku}
                        </td>
                        <td className="px-4 py-2 text-text">
                          {formatPrice(item.price)}
                        </td>
                        <td className="px-4 py-2 text-text">
                          {formatPrice(item.sale_price)}
                        </td>
                        <td className="px-4 py-2 text-text">
                          {formatPrice(item.cost_price)}
                        </td>
                        <td className="px-4 py-2">
                          {item.description ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setDescriptionModal({
                                  name: item.name,
                                  description: item.description,
                                })
                              }
                            >
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Description Modal */}
      <Modal
        open={!!descriptionModal}
        onClose={() => setDescriptionModal(null)}
        title={descriptionModal?.name || ""}
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <div
            className="text-sm text-muted whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: descriptionModal?.description || "",
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
