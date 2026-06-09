"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface AddSheetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (sheet: {
    name: string;
    sheet_url: string;
    sku_column: string;
    stock_column: string;
    sku_prefix: string;
  }) => Promise<void>;
}

export default function AddSheetModal({ open, onClose, onAdd }: AddSheetModalProps) {
  const [name, setName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [skuColumn, setSkuColumn] = useState("SKU");
  const [stockColumn, setStockColumn] = useState("Available Stock");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setSheetUrl("");
    setSkuColumn("SKU");
    setStockColumn("Available Stock");
    setSkuPrefix("");
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError("Give the sheet a name (e.g. \"Sales Team\" or \"Manufacturing\").");
      return;
    }
    if (!sheetUrl.trim()) {
      setError("Paste the Google Sheets link.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        sheet_url: sheetUrl.trim(),
        sku_column: skuColumn.trim() || "SKU",
        stock_column: stockColumn.trim() || "Available Stock",
        sku_prefix: skuPrefix.trim(),
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add sheet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add Google Sheet">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          The sheet must be shared as{" "}
          <span className="text-text font-medium">
            &ldquo;Anyone with the link can view&rdquo;
          </span>{" "}
          so it can be read automatically. It needs a column for the SKU and a
          column for the available stock count.
        </p>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Name
          </label>
          <Input
            placeholder="e.g. Sales Team Orders"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Google Sheets link
          </label>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              SKU column header
            </label>
            <Input value={skuColumn} onChange={(e) => setSkuColumn(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Stock column header
            </label>
            <Input
              value={stockColumn}
              onChange={(e) => setStockColumn(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            SKU prefix to ignore <span className="text-muted/60">(optional)</span>
          </label>
          <Input
            placeholder="e.g. DHM-"
            value={skuPrefix}
            onChange={(e) => setSkuPrefix(e.target.value)}
          />
          <p className="text-xs text-muted/70 mt-1.5">
            If this sheet&rsquo;s SKUs have a prefix that BigCommerce doesn&rsquo;t (e.g.
            sheet says <span className="font-mono text-muted">DHM-3122</span> but
            BigCommerce has <span className="font-mono text-muted">3122</span>), enter
            it here to strip it before matching.
          </p>
        </div>

        {error && <p className="text-sm text-danger whitespace-pre-wrap">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" size="md" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={saving}>
            Add Sheet
          </Button>
        </div>
      </div>
    </Modal>
  );
}
