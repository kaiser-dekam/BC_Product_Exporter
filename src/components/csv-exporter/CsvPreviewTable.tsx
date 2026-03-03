"use client";

import { useMemo } from "react";
import Badge from "@/components/ui/Badge";

interface CsvPreviewTableProps {
  csvContent: string;
  rowCount: number;
  columnCount: number;
  includeVariants: boolean;
}

export default function CsvPreviewTable({
  csvContent,
  rowCount,
  columnCount,
  includeVariants,
}: CsvPreviewTableProps) {
  const { headers, rows } = useMemo(() => {
    if (!csvContent) return { headers: [], rows: [] };

    const lines = csvContent.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };

    // Simple CSV parse: split on commas, handling quoted fields
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = parseLine(lines[0]);
    const dataRows = lines.slice(1).map(parseLine);

    return { headers: headerRow, rows: dataRows };
  }, [csvContent]);

  if (!csvContent) return null;

  return (
    <div className="space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-white/[0.03] border border-border rounded-xl px-4 py-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted">Rows</p>
            <p className="text-lg font-bold text-text">
              {rowCount.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/[0.03] border border-border rounded-xl px-4 py-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted">Columns</p>
            <p className="text-lg font-bold text-text">{columnCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/[0.03] border border-border rounded-xl px-4 py-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs text-muted">Variants</p>
            <Badge variant={includeVariants ? "success" : "default"}>
              {includeVariants ? "Included" : "Excluded"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-border" style={{ maxHeight: "70vh" }}>
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white/[0.06] backdrop-blur">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-4 py-3 border-b border-border whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-border last:border-b-0 hover:bg-white/[0.03] transition-colors"
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-2.5 text-text whitespace-nowrap max-w-[300px] truncate"
                    title={cell}
                  >
                    {cell || <span className="text-muted/40">&mdash;</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
