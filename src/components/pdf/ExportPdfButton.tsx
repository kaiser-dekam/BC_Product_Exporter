"use client";

import { useState, useCallback } from "react";
import Button from "@/components/ui/Button";

interface BookProduct {
  product_cache_id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  claude_summary: string | null;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
}

interface BookSection {
  id: string;
  title: string;
  products: BookProduct[];
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

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");
      const { default: BookPdfDocument } = await import("./BookPdfDocument");

      const doc = BookPdfDocument({
        title,
        subtitle,
        coverColor,
        sections,
      });

      const blob = await pdf(doc).toBlob();
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
  }, [title, subtitle, coverColor, sections]);

  const totalProducts = sections.reduce((sum, s) => sum + s.products.length, 0);

  return (
    <Button
      onClick={handleExport}
      loading={loading}
      size="sm"
      variant="secondary"
      disabled={sections.length === 0 || totalProducts === 0}
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
  );
}
