"use client";

import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_MODELS = [
  {
    value: "claude-haiku-3-5-20241022",
    label: "Claude 3.5 Haiku",
    tier: "Economy",
    tierColor: "bg-success/15 text-success",
    description: "Fastest responses, lowest cost. Best for high-volume summarization.",
    inputPrice: "$0.80",
    outputPrice: "$4",
  },
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4",
    tier: "Balanced",
    tierColor: "bg-accent/15 text-accent",
    description: "Best quality-to-cost ratio. Recommended for most use cases.",
    inputPrice: "$3",
    outputPrice: "$15",
  },
  {
    value: "claude-opus-4-20250514",
    label: "Claude Opus 4",
    tier: "Premium",
    tierColor: "bg-warning/15 text-warning",
    description: "Most capable model. Best for complex descriptions and nuanced content.",
    inputPrice: "$15",
    outputPrice: "$75",
  },
];

export default function SettingsPage() {
  const { getIdToken, isAdmin, refreshRole } = useAuth();

  // Profile
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // BigCommerce
  const [storeHash, setStoreHash] = useState("");
  const [clientId, setClientId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [hasSavedCreds, setHasSavedCreds] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsMessage, setCredsMessage] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // Anthropic
  const [anthropicKey, setAnthropicKey] = useState("");
  const [hasSavedAnthropicKey, setHasSavedAnthropicKey] = useState(false);
  const [anthropicLoading, setAnthropicLoading] = useState(false);
  const [anthropicMessage, setAnthropicMessage] = useState<string | null>(null);
  const [anthropicTestLoading, setAnthropicTestLoading] = useState(false);
  const [anthropicTestMessage, setAnthropicTestMessage] = useState<string | null>(null);

  // System prompt
  const [systemPrompt, setSystemPrompt] = useState("");
  const [systemPromptLoading, setSystemPromptLoading] = useState(false);
  const [systemPromptMessage, setSystemPromptMessage] = useState<string | null>(null);

  // Collaborators
  const [collaboratorEmails, setCollaboratorEmails] = useState<string[]>([]);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsMessage, setCollaboratorsMessage] = useState<string | null>(null);

  // Sales book defaults
  const [bookShowPrice, setBookShowPrice] = useState(true);
  const [bookShowSalePrice, setBookShowSalePrice] = useState(false);
  const [bookShowCostPrice, setBookShowCostPrice] = useState(false);
  const [bookShowVariants, setBookShowVariants] = useState(true);
  const [bookShowPriceList, setBookShowPriceList] = useState(false);
  const [bookDefaultsLoading, setBookDefaultsLoading] = useState(false);
  const [bookDefaultsMessage, setBookDefaultsMessage] = useState<string | null>(null);

  // Price Lists
  const [priceLists, setPriceLists] = useState<Array<{ id: string; name: string; record_count: number; created_at: string }>>([]);
  const [priceListsLoading, setPriceListsLoading] = useState(false);
  const [priceListImportName, setPriceListImportName] = useState("");
  const [priceListImportFile, setPriceListImportFile] = useState<File | null>(null);
  const [priceListImporting, setPriceListImporting] = useState(false);
  const [priceListSyncing, setPriceListSyncing] = useState(false);
  const [priceListMessage, setPriceListMessage] = useState<string | null>(null);

  // Admin settings
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-20250514");
  const [adminSettingsLoading, setAdminSettingsLoading] = useState(false);
  const [adminSettingsMessage, setAdminSettingsMessage] = useState<string | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);

  // Page loading
  const [pageLoading, setPageLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setFullName(data.full_name || "");
        setStoreName(data.store_name || "");
        setHasSavedCreds(!!data.has_bigcommerce_credentials);
        setHasSavedAnthropicKey(!!data.has_anthropic_key);
        setSystemPrompt(data.claude_system_prompt || "");
        setCollaboratorEmails(data.collaborator_emails || []);
        const bp = data.book_preferences ?? {};
        setBookShowPrice(bp.show_price ?? bp.show_main_price ?? true);
        setBookShowSalePrice(bp.show_sale_price ?? false);
        setBookShowCostPrice(bp.show_cost_price ?? false);
        setBookShowVariants(bp.show_variants ?? true);
        setBookShowPriceList(bp.show_price_list ?? false);
      } catch {
        // Silently fail on load - user can still fill in fields
      } finally {
        setPageLoading(false);
      }
    }
    loadProfile();
  }, [getIdToken]);

  // Load admin settings when user is admin
  useEffect(() => {
    if (!isAdmin) return;
    async function loadAdminSettings() {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedModel(data.default_claude_model || "claude-sonnet-4-20250514");
        }
      } catch {
        // Settings will use defaults
      }
    }
    loadAdminSettings();
  }, [isAdmin, getIdToken]);

  // Load price lists on mount
  useEffect(() => {
    async function loadPriceLists() {
      setPriceListsLoading(true);
      try {
        const token = await getIdToken();
        const res = await fetch("/api/price-lists", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPriceLists(data.price_lists || []);
        }
      } catch {
        // Non-critical
      } finally {
        setPriceListsLoading(false);
      }
    }
    loadPriceLists();
  }, [getIdToken]);

  // Auto-clear helper
  const autoClear = useCallback(
    (setter: (val: string | null) => void) => {
      setTimeout(() => setter(null), 5000);
    },
    []
  );

  // Handler: Save Profile
  const handleProfileSave = useCallback(async () => {
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ full_name: fullName, store_name: storeName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save profile");
      }
      setProfileMessage("Profile saved successfully.");
      autoClear(setProfileMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setProfileMessage(`Error: ${msg}`);
      autoClear(setProfileMessage);
    } finally {
      setProfileLoading(false);
    }
  }, [getIdToken, fullName, storeName, autoClear]);

  // Handler: Save BigCommerce Credentials
  const handleCredsSave = useCallback(async () => {
    setCredsLoading(true);
    setCredsMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/settings/credentials", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_hash: storeHash,
          client_id: clientId,
          access_token: accessToken,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save credentials");
      }
      setHasSavedCreds(true);
      setStoreHash("");
      setClientId("");
      setAccessToken("");
      setCredsMessage("Credentials saved successfully.");
      autoClear(setCredsMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCredsMessage(`Error: ${msg}`);
      autoClear(setCredsMessage);
    } finally {
      setCredsLoading(false);
    }
  }, [getIdToken, storeHash, clientId, accessToken, autoClear]);

  // Handler: Test BigCommerce Connection
  const handleTestConnection = useCallback(async () => {
    setTestLoading(true);
    setTestMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/settings/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          store_hash: storeHash,
          client_id: clientId,
          access_token: accessToken,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Connection test failed");
      }
      setTestMessage("Connection successful!");
      autoClear(setTestMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setTestMessage(`Error: ${msg}`);
      autoClear(setTestMessage);
    } finally {
      setTestLoading(false);
    }
  }, [getIdToken, storeHash, clientId, accessToken, autoClear]);

  // Handler: Save Anthropic API Key
  const handleAnthropicSave = useCallback(async () => {
    setAnthropicLoading(true);
    setAnthropicMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/settings/anthropic", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ api_key: anthropicKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save API key");
      }
      setHasSavedAnthropicKey(true);
      setAnthropicKey("");
      setAnthropicMessage("API key saved successfully.");
      autoClear(setAnthropicMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAnthropicMessage(`Error: ${msg}`);
      autoClear(setAnthropicMessage);
    } finally {
      setAnthropicLoading(false);
    }
  }, [getIdToken, anthropicKey, autoClear]);

  // Handler: Test Anthropic API Key
  const handleAnthropicTest = useCallback(async () => {
    setAnthropicTestLoading(true);
    setAnthropicTestMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/settings/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ api_key: anthropicKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "API key test failed");
      }
      setAnthropicTestMessage("API key is valid!");
      autoClear(setAnthropicTestMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAnthropicTestMessage(`Error: ${msg}`);
      autoClear(setAnthropicTestMessage);
    } finally {
      setAnthropicTestLoading(false);
    }
  }, [getIdToken, anthropicKey, autoClear]);

  // Handler: Save System Prompt
  const handleSystemPromptSave = useCallback(async () => {
    setSystemPromptLoading(true);
    setSystemPromptMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          claude_system_prompt: systemPrompt || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save system prompt");
      }
      setSystemPromptMessage("System prompt saved.");
      autoClear(setSystemPromptMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setSystemPromptMessage(`Error: ${msg}`);
      autoClear(setSystemPromptMessage);
    } finally {
      setSystemPromptLoading(false);
    }
  }, [getIdToken, systemPrompt, autoClear]);

  // Handler: Reset System Prompt to default
  const handleSystemPromptReset = useCallback(() => {
    setSystemPrompt("");
    setSystemPromptMessage("Cleared. Save to apply the default prompt.");
    autoClear(setSystemPromptMessage);
  }, [autoClear]);

  // Handler: Add collaborator email
  const handleAddCollaborator = useCallback(() => {
    const email = newCollaboratorEmail.trim().toLowerCase();
    if (!email || collaboratorEmails.includes(email)) return;
    setCollaboratorEmails((prev) => [...prev, email]);
    setNewCollaboratorEmail("");
  }, [newCollaboratorEmail, collaboratorEmails]);

  // Handler: Remove collaborator email
  const handleRemoveCollaborator = useCallback((email: string) => {
    setCollaboratorEmails((prev) => prev.filter((e) => e !== email));
  }, []);

  // Handler: Save collaborators
  const handleCollaboratorsSave = useCallback(async () => {
    setCollaboratorsLoading(true);
    setCollaboratorsMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ collaborator_emails: collaboratorEmails }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save collaborators");
      }
      setCollaboratorsMessage("Collaborators saved.");
      autoClear(setCollaboratorsMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setCollaboratorsMessage(`Error: ${msg}`);
      autoClear(setCollaboratorsMessage);
    } finally {
      setCollaboratorsLoading(false);
    }
  }, [getIdToken, collaboratorEmails, autoClear]);

  // Handler: Save Sales Book Defaults
  const handleBookDefaultsSave = useCallback(async () => {
    setBookDefaultsLoading(true);
    setBookDefaultsMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          book_preferences: {
            show_price: bookShowPrice,
            show_sale_price: bookShowSalePrice,
            show_cost_price: bookShowCostPrice,
            show_variants: bookShowVariants,
            show_price_list: bookShowPriceList,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save book defaults");
      }
      setBookDefaultsMessage("Defaults saved.");
      autoClear(setBookDefaultsMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setBookDefaultsMessage(`Error: ${msg}`);
      autoClear(setBookDefaultsMessage);
    } finally {
      setBookDefaultsLoading(false);
    }
  }, [getIdToken, bookShowPrice, bookShowSalePrice, bookShowCostPrice, bookShowVariants, bookShowPriceList, autoClear]);

  // Handler: Sync Price Lists from BigCommerce
  const handlePriceListSync = useCallback(async () => {
    setPriceListSyncing(true);
    setPriceListMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/bigcommerce/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Sync failed");
      }

      const data = await res.json();
      setPriceListMessage(data.message || "Price lists synced.");
      autoClear(setPriceListMessage);

      // Reload price lists after sync
      const listRes = await fetch("/api/price-lists", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        setPriceLists(listData.price_lists || []);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setPriceListMessage(`Error: ${msg}`);
      autoClear(setPriceListMessage);
    } finally {
      setPriceListSyncing(false);
    }
  }, [getIdToken, autoClear]);

  // Handler: Import Price List CSV
  const handlePriceListImport = useCallback(async () => {
    if (!priceListImportFile || !priceListImportName.trim()) return;

    setPriceListImporting(true);
    setPriceListMessage(null);

    try {
      // Parse CSV client-side — handles quoted fields with commas
      const text = await priceListImportFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

      // Parse a single CSV line respecting quoted fields
      function parseCsvLine(line: string): string[] {
        const cols: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (inQuotes) {
            if (ch === '"' && line[i + 1] === '"') {
              current += '"';
              i++; // skip escaped quote
            } else if (ch === '"') {
              inQuotes = false;
            } else {
              current += ch;
            }
          } else {
            if (ch === '"') {
              inQuotes = true;
            } else if (ch === ",") {
              cols.push(current.trim());
              current = "";
            } else {
              current += ch;
            }
          }
        }
        cols.push(current.trim());
        return cols;
      }

      const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const skuIdx = headers.findIndex((h) => h === "sku" || h === "variant_sku" || h === "product_sku");
      const priceIdx = headers.findIndex((h) => h === "price" || h === "customer_price" || h === "list_price");

      if (skuIdx === -1) throw new Error("CSV must have a 'sku' column (found: " + headers.join(", ") + ")");
      if (priceIdx === -1) throw new Error("CSV must have a 'price' column (found: " + headers.join(", ") + ")");

      const records: Array<{ sku: string; price: number }> = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const sku = cols[skuIdx];
        const price = parseFloat(cols[priceIdx]);
        if (sku && !isNaN(price)) {
          records.push({ sku, price });
        }
      }

      if (records.length === 0) throw new Error("No valid SKU/price rows found in CSV");

      const token = await getIdToken();
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: priceListImportName.trim(), records }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to import price list");
      }

      const data = await res.json();
      setPriceLists((prev) => [data.price_list, ...prev]);
      setPriceListImportName("");
      setPriceListImportFile(null);
      setPriceListMessage(`Imported "${data.price_list.name}" with ${data.price_list.record_count} prices.`);
      autoClear(setPriceListMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setPriceListMessage(`Error: ${msg}`);
      autoClear(setPriceListMessage);
    } finally {
      setPriceListImporting(false);
    }
  }, [getIdToken, priceListImportFile, priceListImportName, autoClear]);

  // Handler: Delete Price List
  const handlePriceListDelete = useCallback(async (id: string) => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/price-lists/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setPriceLists((prev) => prev.filter((pl) => pl.id !== id));
    } catch {
      // Silently fail — user can retry
    }
  }, [getIdToken]);

  // Handler: Save Admin Settings
  const handleAdminSettingsSave = useCallback(async () => {
    setAdminSettingsLoading(true);
    setAdminSettingsMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ default_claude_model: selectedModel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save settings");
      }
      setAdminSettingsMessage("Admin settings saved.");
      autoClear(setAdminSettingsMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setAdminSettingsMessage(`Error: ${msg}`);
      autoClear(setAdminSettingsMessage);
    } finally {
      setAdminSettingsLoading(false);
    }
  }, [getIdToken, selectedModel, autoClear]);

  // Handler: Bootstrap Admin
  const handleBootstrapAdmin = useCallback(async () => {
    setBootstrapLoading(true);
    setBootstrapMessage(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bootstrap failed");
      }
      setBootstrapMessage(data.message || "You are now an admin!");
      await refreshRole();
      autoClear(setBootstrapMessage);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setBootstrapMessage(`Error: ${msg}`);
      autoClear(setBootstrapMessage);
    } finally {
      setBootstrapLoading(false);
    }
  }, [getIdToken, refreshRole, autoClear]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-muted mb-6">Manage your profile and API credentials.</p>

      {pageLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Profile */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Profile
            </h3>
            <div className="space-y-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Store Name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="My BigCommerce Store"
              />
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleProfileSave}
                  loading={profileLoading}
                  size="sm"
                >
                  Save Profile
                </Button>
                {profileMessage && (
                  <span
                    className={`text-sm ${
                      profileMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {profileMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Section 2: BigCommerce Credentials */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              BigCommerce Credentials
            </h3>
            {hasSavedCreds && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-success">Credentials saved</span>
              </div>
            )}
            <p className="text-xs text-muted mb-4">
              Enter new credentials to {hasSavedCreds ? "update" : "save"} them.
              Credentials are encrypted at rest.
            </p>
            <div className="space-y-4">
              <Input
                label="Store Hash"
                value={storeHash}
                onChange={(e) => setStoreHash(e.target.value)}
                placeholder="abc123"
              />
              <Input
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Your Client ID"
              />
              <Input
                label="Access Token"
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="Your Access Token"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleCredsSave}
                  loading={credsLoading}
                  size="sm"
                  disabled={!storeHash || !clientId || !accessToken}
                >
                  Save Credentials
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleTestConnection}
                  loading={testLoading}
                  size="sm"
                  disabled={!storeHash || !clientId || !accessToken}
                >
                  Test Connection
                </Button>
                {credsMessage && (
                  <span
                    className={`text-sm ${
                      credsMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {credsMessage}
                  </span>
                )}
                {testMessage && (
                  <span
                    className={`text-sm ${
                      testMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {testMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Section 3: Anthropic API Key */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Anthropic API Key
            </h3>
            {hasSavedAnthropicKey && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-success/10 border border-success/20">
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm text-success">API key saved</span>
              </div>
            )}
            <p className="text-xs text-muted mb-4">
              Optional. Used for AI-powered product summarization. If not set,
              the system default key will be used.
            </p>
            <div className="space-y-4">
              <Input
                label="API Key"
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleAnthropicSave}
                  loading={anthropicLoading}
                  size="sm"
                  disabled={!anthropicKey}
                >
                  Save API Key
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleAnthropicTest}
                  loading={anthropicTestLoading}
                  size="sm"
                  disabled={!anthropicKey}
                >
                  Test Key
                </Button>
                {anthropicMessage && (
                  <span
                    className={`text-sm ${
                      anthropicMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {anthropicMessage}
                  </span>
                )}
                {anthropicTestMessage && (
                  <span
                    className={`text-sm ${
                      anthropicTestMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {anthropicTestMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Section 4: AI System Prompt */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              AI System Prompt
            </h3>
            <p className="text-xs text-muted mb-4">
              Customize the system prompt used when Claude analyzes your product
              descriptions. Leave blank to use the default prompt.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  System Prompt
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent resize-y text-sm"
                  placeholder="You are a product catalog specialist. Given product information, create a concise, professional summary suitable for a sales book. Include key features, specifications, and selling points. Keep it under 150 words."
                />
                <p className="text-xs text-muted mt-1">
                  {systemPrompt
                    ? `${systemPrompt.length} characters — custom prompt active`
                    : "Using default prompt"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleSystemPromptSave}
                  loading={systemPromptLoading}
                  size="sm"
                >
                  Save Prompt
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSystemPromptReset}
                  size="sm"
                  disabled={!systemPrompt}
                >
                  Reset to Default
                </Button>
                {systemPromptMessage && (
                  <span
                    className={`text-sm ${
                      systemPromptMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {systemPromptMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Section 5: Collaborators */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Collaborators
            </h3>
            <p className="text-xs text-muted mb-4">
              Add email addresses of other users who can view and edit your Sales
              Books. They must have an account with that email to access your
              books.
            </p>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="colleague@example.com"
                    value={newCollaboratorEmail}
                    onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCollaborator()}
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleAddCollaborator}
                  disabled={!newCollaboratorEmail.trim()}
                >
                  Add
                </Button>
              </div>
              {collaboratorEmails.length > 0 && (
                <ul className="space-y-2">
                  {collaboratorEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-border text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(email)}
                        className="text-muted hover:text-danger transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCollaboratorsSave}
                  loading={collaboratorsLoading}
                  size="sm"
                >
                  Save Collaborators
                </Button>
                {collaboratorsMessage && (
                  <span
                    className={`text-sm ${
                      collaboratorsMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {collaboratorsMessage}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Section 6: Sales Book Defaults */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Sales Book Defaults
            </h3>
            <p className="text-xs text-muted mb-4">
              Default price display settings applied when new products are added to a sales book.
              You can still override these per product.
            </p>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bookShowPrice}
                  onChange={(e) => setBookShowPrice(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-text transition-colors">Show regular price</p>
                  <p className="text-xs text-muted">Display the base product price in the PDF</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bookShowSalePrice}
                  onChange={(e) => setBookShowSalePrice(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-text transition-colors">Show sale price</p>
                  <p className="text-xs text-muted">Display the sale price when available</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bookShowCostPrice}
                  onChange={(e) => setBookShowCostPrice(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-text transition-colors">Show cost price</p>
                  <p className="text-xs text-muted">Display the cost/wholesale price when available</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bookShowVariants}
                  onChange={(e) => setBookShowVariants(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-text transition-colors">Show variants</p>
                  <p className="text-xs text-muted">Display variant rows with individual pricing in the PDF</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bookShowPriceList}
                  onChange={(e) => setBookShowPriceList(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                />
                <div>
                  <p className="text-sm font-medium group-hover:text-text transition-colors">Show price list price</p>
                  <p className="text-xs text-muted">Display the price list price when available (imported from BigCommerce Price Lists)</p>
                </div>
              </label>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                onClick={handleBookDefaultsSave}
                loading={bookDefaultsLoading}
                size="sm"
              >
                Save Defaults
              </Button>
              {bookDefaultsMessage && (
                <span
                  className={`text-sm ${
                    bookDefaultsMessage.startsWith("Error") ? "text-danger" : "text-success"
                  }`}
                >
                  {bookDefaultsMessage}
                </span>
              )}
            </div>
          </Card>

          {/* Section 7: Price Lists */}
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-1">
              Price Lists
            </h3>
            <p className="text-xs text-muted mb-4">
              Sync your BigCommerce Price Lists to display customer-group pricing in the Product Library, Price Adjuster, and Sales Books.
            </p>

            {/* Primary: Sync from BigCommerce */}
            <div className="flex items-center gap-3 mb-5">
              <Button
                onClick={handlePriceListSync}
                loading={priceListSyncing}
                size="sm"
              >
                {priceListSyncing ? "Syncing…" : "Sync from BigCommerce"}
              </Button>
              {priceListMessage && (
                <span className={`text-sm ${priceListMessage.startsWith("Error") ? "text-danger" : "text-success"}`}>
                  {priceListMessage}
                </span>
              )}
            </div>

            {/* Existing price lists */}
            {priceListsLoading ? (
              <p className="text-xs text-muted">Loading price lists…</p>
            ) : priceLists.length === 0 ? (
              <p className="text-xs text-muted">No price lists synced yet. Click &quot;Sync from BigCommerce&quot; to import.</p>
            ) : (
              <div className="space-y-2 mb-5">
                {priceLists.map((pl) => (
                  <div key={pl.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{pl.name}</p>
                      <p className="text-xs text-muted">{pl.record_count.toLocaleString()} prices · {new Date(pl.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => handlePriceListDelete(pl.id)}
                      className="text-muted hover:text-danger transition-colors p-1 rounded"
                      title="Delete price list"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Fallback: Manual CSV import */}
            <details className="group">
              <summary className="text-xs text-muted cursor-pointer hover:text-text transition-colors list-none flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Manual CSV import
              </summary>
              <div className="mt-3 space-y-3 pl-4 border-l border-border">
                <p className="text-xs text-muted">
                  Import a custom price list from a CSV file. Must have a <code className="bg-white/5 px-1 rounded">sku</code> column and a <code className="bg-white/5 px-1 rounded">price</code> column.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1">Price List Name</label>
                  <input
                    type="text"
                    value={priceListImportName}
                    onChange={(e) => setPriceListImportName(e.target.value)}
                    placeholder="e.g. Wholesale, VIP, Contractor"
                    className="w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setPriceListImportFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-muted file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
                  />
                </div>
                <Button
                  onClick={handlePriceListImport}
                  loading={priceListImporting}
                  disabled={!priceListImportName.trim() || !priceListImportFile}
                  size="sm"
                  variant="ghost"
                >
                  Import CSV
                </Button>
              </div>
            </details>
          </Card>

          {/* Section 8: Admin Settings (only visible to admins) */}
          {isAdmin && (
            <Card>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Admin Settings
              </h3>
              <p className="text-xs text-muted mb-4">
                Site-wide configuration. Changes affect all users.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Default Claude Model
                  </label>
                  <div className="space-y-2">
                    {ALLOWED_MODELS.map((m) => {
                      const isSelected = selectedModel === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setSelectedModel(m.value)}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-accent bg-accent/5 ring-1 ring-accent"
                              : "border-border bg-surface hover:border-accent/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                                  isSelected
                                    ? "border-accent bg-accent"
                                    : "border-border"
                                }`}
                              />
                              <span className="text-sm font-semibold">{m.label}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.tierColor}`}>
                                {m.tier}
                              </span>
                            </div>
                            <span className="text-xs text-muted whitespace-nowrap">
                              {m.inputPrice} / {m.outputPrice} per 1M tokens
                            </span>
                          </div>
                          <p className="text-xs text-muted pl-5">{m.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleAdminSettingsSave}
                    loading={adminSettingsLoading}
                    size="sm"
                  >
                    Save Admin Settings
                  </Button>
                  {adminSettingsMessage && (
                    <span
                      className={`text-sm ${
                        adminSettingsMessage.startsWith("Error")
                          ? "text-danger"
                          : "text-success"
                      }`}
                    >
                      {adminSettingsMessage}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Bootstrap Admin (shown when not yet admin — one-time use) */}
          {!isAdmin && (
            <Card>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Admin Access
              </h3>
              <p className="text-xs text-muted mb-4">
                If no admin exists yet, you can claim admin access. This is a
                one-time action.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleBootstrapAdmin}
                  loading={bootstrapLoading}
                  size="sm"
                  variant="secondary"
                >
                  Claim Admin Access
                </Button>
                {bootstrapMessage && (
                  <span
                    className={`text-sm ${
                      bootstrapMessage.startsWith("Error")
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {bootstrapMessage}
                  </span>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
