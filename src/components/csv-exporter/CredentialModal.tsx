"use client";

import { useState, useCallback, useRef, type ChangeEvent } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export interface Credentials {
  store_hash: string;
  client_id: string;
  access_token: string;
}

interface CredentialModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (credentials: Credentials) => void;
}

/**
 * Parse a BigCommerce credential TXT file.
 *
 * Accepted line formats:
 *   ACCESS TOKEN: <value>
 *   CLIENT ID: <value>
 *   API PATH: https://api.bigcommerce.com/stores/{store_hash}/v3/...
 *   STORE HASH: <value>
 *
 * Values wrapped in braces (e.g. {placeholder}) are stripped to their inner text.
 */
function parseCredentialFile(text: string): Partial<Credentials> {
  const result: Partial<Credentials> = {};
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();

    // ACCESS TOKEN
    const atMatch = line.match(/^ACCESS\s+TOKEN\s*:\s*(.+)/i);
    if (atMatch) {
      result.access_token = stripBraces(atMatch[1].trim());
      continue;
    }

    // CLIENT ID
    const ciMatch = line.match(/^CLIENT\s+ID\s*:\s*(.+)/i);
    if (ciMatch) {
      result.client_id = stripBraces(ciMatch[1].trim());
      continue;
    }

    // STORE HASH (direct)
    const shMatch = line.match(/^STORE\s+HASH\s*:\s*(.+)/i);
    if (shMatch) {
      result.store_hash = stripBraces(shMatch[1].trim());
      continue;
    }

    // API PATH  -> extract store hash from URL
    const apMatch = line.match(/^API\s+PATH\s*:\s*(.+)/i);
    if (apMatch) {
      const urlMatch = apMatch[1].match(
        /api\.bigcommerce\.com\/stores\/([^/]+)/i
      );
      if (urlMatch) {
        result.store_hash = stripBraces(urlMatch[1].trim());
      }
      continue;
    }
  }

  return result;
}

function stripBraces(value: string): string {
  const m = value.match(/^\{(.+)\}$/);
  return m ? m[1] : value;
}

export default function CredentialModal({
  open,
  onClose,
  onSubmit,
}: CredentialModalProps) {
  const [storeHash, setStoreHash] = useState("");
  const [clientId, setClientId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed = parseCredentialFile(text);
        if (parsed.store_hash) setStoreHash(parsed.store_hash);
        if (parsed.client_id) setClientId(parsed.client_id);
        if (parsed.access_token) setAccessToken(parsed.access_token);
        setErrors({});
      };
      reader.readAsText(file);
    },
    []
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!storeHash.trim()) newErrors.store_hash = "Store hash is required";
    if (!clientId.trim()) newErrors.client_id = "Client ID is required";
    if (!accessToken.trim())
      newErrors.access_token = "Access token is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [storeHash, clientId, accessToken]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    onSubmit({
      store_hash: storeHash.trim(),
      client_id: clientId.trim(),
      access_token: accessToken.trim(),
    });
  }, [validate, onSubmit, storeHash, clientId, accessToken]);

  const handleCancel = useCallback(() => {
    setStoreHash("");
    setClientId("");
    setAccessToken("");
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleCancel} title="BigCommerce Credentials">
      <div className="space-y-4">
        {/* File upload */}
        <div>
          <p className="text-sm text-muted mb-2">
            Upload a BigCommerce credentials file (.txt) or enter them manually
            below.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload .txt File
          </Button>
        </div>

        <div className="h-px bg-border" />

        {/* Manual entry */}
        <Input
          label="Store Hash"
          placeholder="e.g. abc123xyz"
          value={storeHash}
          onChange={(e) => {
            setStoreHash(e.target.value);
            setErrors((prev) => ({ ...prev, store_hash: "" }));
          }}
          error={errors.store_hash}
        />
        <Input
          label="Client ID"
          placeholder="Your BigCommerce Client ID"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setErrors((prev) => ({ ...prev, client_id: "" }));
          }}
          error={errors.client_id}
        />
        <Input
          label="Access Token"
          type="password"
          placeholder="Your BigCommerce Access Token"
          value={accessToken}
          onChange={(e) => {
            setAccessToken(e.target.value);
            setErrors((prev) => ({ ...prev, access_token: "" }));
          }}
          error={errors.access_token}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Continue</Button>
        </div>
      </div>
    </Modal>
  );
}
