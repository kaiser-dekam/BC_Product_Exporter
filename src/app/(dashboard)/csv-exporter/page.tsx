"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_SELECTED_FIELDS,
  FACEBOOK_TEMPLATE_FIELDS,
  FIELD_OPTIONS,
} from "@/lib/bigcommerce/fields";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

import CredentialModal, {
  type Credentials,
} from "@/components/csv-exporter/CredentialModal";
import FieldLibrary from "@/components/csv-exporter/FieldLibrary";
import FieldOrderList from "@/components/csv-exporter/FieldOrderList";
import SelectedColumnsPreview from "@/components/csv-exporter/SelectedColumnsPreview";
import FilterBar from "@/components/csv-exporter/FilterBar";
import CustomDomainInput from "@/components/csv-exporter/CustomDomainInput";
import CsvPreviewTable from "@/components/csv-exporter/CsvPreviewTable";
import ExportActions from "@/components/csv-exporter/ExportActions";

interface FilterValues {
  includeVariants: boolean;
  includeUnavailable: boolean;
  includeHidden: boolean;
}

export default function CsvExporterPage() {
  const { getIdToken } = useAuth();

  // Credentials
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [showCredentialModal, setShowCredentialModal] = useState(false);

  // Field selection & ordering
  const [selectedFields, setSelectedFields] = useState<string[]>(
    DEFAULT_SELECTED_FIELDS
  );
  const [fieldOrder, setFieldOrder] = useState<string[]>(
    DEFAULT_SELECTED_FIELDS
  );

  // Filters
  const [filters, setFilters] = useState<FilterValues>({
    includeVariants: false,
    includeUnavailable: false,
    includeHidden: false,
  });

  // Custom domain
  const [customDomain, setCustomDomain] = useState("");

  // Export state
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [columnCount, setColumnCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Reconcile field order: keep existing order for still-selected fields,
  // append any newly selected fields at the end.
  // ---------------------------------------------------------------------------
  const reconcileOrder = useCallback(
    (selected: string[]): string[] => {
      const newOrder = fieldOrder.filter((f) => selected.includes(f));
      selected.forEach((f) => {
        if (!newOrder.includes(f)) newOrder.push(f);
      });
      return newOrder;
    },
    [fieldOrder]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCredentialSubmit = useCallback((creds: Credentials) => {
    setCredentials(creds);
    setShowCredentialModal(false);
  }, []);

  const handleFieldToggle = useCallback(
    (field: string) => {
      setSelectedFields((prev) => {
        const next = prev.includes(field)
          ? prev.filter((f) => f !== field)
          : [...prev, field];
        const newOrder = reconcileOrder(next);
        setFieldOrder(newOrder);
        return next;
      });
    },
    [reconcileOrder]
  );

  const handleReorder = useCallback((newOrder: string[]) => {
    setFieldOrder(newOrder);
  }, []);

  const handleFilterChange = useCallback(
    (key: keyof FilterValues, value: boolean) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleReset = useCallback(() => {
    setSelectedFields(DEFAULT_SELECTED_FIELDS);
    setFieldOrder(DEFAULT_SELECTED_FIELDS);
    setCsvContent(null);
    setRowCount(0);
    setColumnCount(0);
    setError(null);
  }, []);

  const handleFacebookTemplate = useCallback(() => {
    setSelectedFields(FACEBOOK_TEMPLATE_FIELDS);
    setFieldOrder(FACEBOOK_TEMPLATE_FIELDS);
  }, []);

  const handleExport = useCallback(async () => {
    if (!credentials) return;
    setLoading(true);
    setError(null);
    setCsvContent(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/csv/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          credentials: {
            store_hash: credentials.store_hash,
            client_id: credentials.client_id,
            access_token: credentials.access_token,
          },
          fields: fieldOrder,
          include_variants: filters.includeVariants,
          include_unavailable: filters.includeUnavailable,
          include_hidden: filters.includeHidden,
          custom_domain: customDomain || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || `Export failed with status ${res.status}`
        );
      }

      const data = await res.json();
      setCsvContent(data.csv_content);
      setRowCount(data.row_count ?? 0);
      setColumnCount(data.column_count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [credentials, getIdToken, fieldOrder, filters, customDomain]);

  const handleDownload = useCallback(async () => {
    if (!credentials) return;
    setLoading(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/csv/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          credentials: {
            store_hash: credentials.store_hash,
            client_id: credentials.client_id,
            access_token: credentials.access_token,
          },
          fields: fieldOrder,
          include_variants: filters.includeVariants,
          include_unavailable: filters.includeUnavailable,
          include_hidden: filters.includeHidden,
          custom_domain: customDomain || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bigcommerce-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Download failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [credentials, getIdToken, fieldOrder, filters, customDomain]);

  // ---------------------------------------------------------------------------
  // Gate: credentials required
  // ---------------------------------------------------------------------------
  if (!credentials) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">CSV Exporter</h1>
        <p className="text-muted mb-6">
          Pull product data from BigCommerce and export to CSV.
        </p>

        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">
            Connect Your BigCommerce Store
          </h2>
          <p className="text-muted text-sm max-w-md mb-6">
            Enter your BigCommerce API credentials to start exporting product
            data as CSV files.
          </p>
          <Button onClick={() => setShowCredentialModal(true)} size="lg">
            Get Started
          </Button>
        </Card>

        <CredentialModal
          open={showCredentialModal}
          onClose={() => setShowCredentialModal(false)}
          onSubmit={handleCredentialSubmit}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main UI: field selection + export
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">CSV Exporter</h1>
          <p className="text-muted text-sm">
            Select fields, arrange column order, and export.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCredentialModal(true)}
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Change Credentials
        </Button>
      </div>

      {/* Column preview + custom domain */}
      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
          Column Order Preview
        </h3>
        <SelectedColumnsPreview fields={fieldOrder} />
        <div className="mt-4">
          <CustomDomainInput
            visible={selectedFields.includes("custom_url")}
            value={customDomain}
            onChange={setCustomDomain}
          />
        </div>
      </Card>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Left: Field Library */}
        <Card>
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Available Fields
          </h3>
          <p className="text-xs text-muted mb-4">
            {selectedFields.length} of {Object.keys(FIELD_OPTIONS).length}{" "}
            fields selected
          </p>
          <FieldLibrary
            selectedFields={selectedFields}
            onToggle={handleFieldToggle}
          />
        </Card>

        {/* Right: Order + Filters + Actions */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Column Order
            </h3>
            <p className="text-xs text-muted mb-3">
              Drag to reorder columns in the exported CSV.
            </p>
            <div className="max-h-[400px] overflow-y-auto pr-1">
              <FieldOrderList
                fields={fieldOrder}
                onReorder={handleReorder}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
              Filters
            </h3>
            <FilterBar values={filters} onChange={handleFilterChange} />
          </Card>

          <Card>
            <ExportActions
              onExport={handleExport}
              onReset={handleReset}
              onFacebookTemplate={handleFacebookTemplate}
              loading={loading}
            />
          </Card>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-danger shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-danger">Export Error</p>
              <p className="text-sm text-muted mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Spinner size="lg" />
          <span className="text-muted">Generating export...</span>
        </div>
      )}

      {/* CSV Preview */}
      {csvContent && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Export Preview</h2>
            <Button onClick={handleDownload} loading={loading}>
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download CSV
            </Button>
          </div>
          <CsvPreviewTable
            csvContent={csvContent}
            rowCount={rowCount}
            columnCount={columnCount}
            includeVariants={filters.includeVariants}
          />
        </div>
      )}

      {/* Credential modal */}
      <CredentialModal
        open={showCredentialModal}
        onClose={() => setShowCredentialModal(false)}
        onSubmit={handleCredentialSubmit}
      />
    </div>
  );
}
