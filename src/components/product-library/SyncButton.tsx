"use client";

import Button from "@/components/ui/Button";

interface SyncButtonProps {
  onSync: () => void;
  loading: boolean;
  lastSyncedAt: string | null;
  productCount: number;
}

export default function SyncButton({ onSync, loading, lastSyncedAt, productCount }: SyncButtonProps) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex items-center gap-4">
      <Button onClick={onSync} loading={loading} size="sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? "Syncing..." : "Sync Products"}
      </Button>
      {lastSyncedAt && (
        <span className="text-xs text-muted">
          Last synced: {formatDate(lastSyncedAt)} · {productCount} products
        </span>
      )}
    </div>
  );
}
