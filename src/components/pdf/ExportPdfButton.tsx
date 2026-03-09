"use client";

import { useState, useCallback, useRef } from "react";
import Button from "@/components/ui/Button";
import type { SectionItem } from "@/app/(dashboard)/books/[bookId]/page";

interface BookSection {
  id: string;
  title: string;
  items: SectionItem[];
}

interface ExportPdfButtonProps {
  title: string;
  subtitle: string;
  coverColor: string;
  sections: BookSection[];
}

export default function ExportPdfButton({
  title,
  subtitle,
  coverColor,
  sections,
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const generateBlob = useCallback(async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { default: BookPdfDocument } = await import("./BookPdfDocument");

    const doc = BookPdfDocument({
      title,
      subtitle,
      coverColor,
      sections,
    });

    return pdf(doc).toBlob();
  }, [title, subtitle, coverColor, sections]);

  // ---- Preview in modal ----
  const handlePreview = useCallback(async () => {
    setPreviewing(true);
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      console.error("PDF preview failed:", err);
      alert("Failed to generate PDF preview. Please try again.");
      setPreviewing(false);
    }
  }, [generateBlob]);

  const closePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewing(false);
  }, []);

  // ---- Download from preview ----
  const handleDownloadFromPreview = useCallback(() => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_Sales_Book.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [previewUrl, title]);

  // ---- Direct export (download) ----
  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}_Sales_Book.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [generateBlob, title]);

  const totalProducts = sections.reduce(
    (sum, s) => sum + s.items.filter((i) => i.type === "product").length,
    0
  );

  const disabled = sections.length === 0 || totalProducts === 0;

  return (
    <>
      {/* Preview button */}
      <Button
        onClick={handlePreview}
        loading={previewing && !previewUrl}
        size="sm"
        variant="ghost"
        disabled={disabled}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        {previewing && !previewUrl ? "Generating..." : "Preview"}
      </Button>

      {/* Export / download button */}
      <Button
        onClick={handleExport}
        loading={loading}
        size="sm"
        variant="secondary"
        disabled={disabled}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {loading ? "Generating PDF..." : "Export PDF"}
      </Button>

      {/* Fullscreen preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
            <h3 className="text-sm font-semibold">PDF Preview</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleDownloadFromPreview}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </Button>
              <Button size="sm" variant="ghost" onClick={closePreview}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Close
              </Button>
            </div>
          </div>
          {/* PDF iframe */}
          <div className="flex-1 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        </div>
      )}
    </>
  );
}
