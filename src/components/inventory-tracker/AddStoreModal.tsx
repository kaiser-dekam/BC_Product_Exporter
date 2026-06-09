"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface AddStoreModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (store: {
    name: string;
    store_hash: string;
    client_id: string;
    access_token: string;
    sku_prefix: string;
  }) => Promise<void>;
}

export default function AddStoreModal({ open, onClose, onAdd }: AddStoreModalProps) {
  const [name, setName] = useState("");
  const [storeHash, setStoreHash] = useState("");
  const [clientId, setClientId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setStoreHash("");
    setClientId("");
    setAccessToken("");
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
      setError("Give the store a name (e.g. \"Warehouse B\" or \"EU Store\").");
      return;
    }
    if (!storeHash.trim() || !clientId.trim() || !accessToken.trim()) {
      setError("Store hash, client ID and access token are all required.");
      return;
    }

    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        store_hash: storeHash.trim(),
        client_id: clientId.trim(),
        access_token: accessToken.trim(),
        sku_prefix: skuPrefix.trim(),
      });
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add store");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add BigCommerce Store">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Add another BigCommerce store as a comparison column. Its API token is
          stored encrypted and only used to read inventory. The store column shows
          total available-to-sell per SKU across that store&rsquo;s locations.
        </p>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">Name</label>
          <Input
            placeholder="e.g. Warehouse B"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Store hash
          </label>
          <Input
            placeholder="e.g. abc123def"
            value={storeHash}
            onChange={(e) => setStoreHash(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            API client ID
          </label>
          <Input value={clientId} onChange={(e) => setClientId(e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            API access token
          </label>
          <Input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
          />
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
            Stripped from this store&rsquo;s SKUs before matching, in case they carry a
            prefix your main store doesn&rsquo;t.
          </p>
        </div>

        {error && <p className="text-sm text-danger whitespace-pre-wrap">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button variant="ghost" size="md" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} loading={saving}>
            Add Store
          </Button>
        </div>
      </div>
    </Modal>
  );
}
