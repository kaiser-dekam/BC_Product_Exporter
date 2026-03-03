"use client";

import { useState, useCallback, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { getIdToken } = useAuth();

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
        setHasSavedCreds(!!data.has_saved_creds);
        setHasSavedAnthropicKey(!!data.has_saved_anthropic_key);
      } catch {
        // Silently fail on load - user can still fill in fields
      } finally {
        setPageLoading(false);
      }
    }
    loadProfile();
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
        </div>
      )}
    </div>
  );
}
