"use client";

import { useState, useCallback } from "react";
import Button from "@/components/ui/Button";

type PriceField = "price" | "sale_price" | "cost_price";
type AdjustMode = "amount" | "percentage";
type RoundDirection = "none" | "up" | "down";
type RoundTo = 1 | 5 | 10;

interface BulkPriceControlsProps {
  selectedCount: number;
  onApply: (options: {
    field: PriceField;
    mode: AdjustMode;
    value: number;
    round: RoundDirection;
    roundTo: RoundTo;
  }) => void;
}

const fieldLabels: Record<PriceField, string> = {
  price: "Price",
  sale_price: "Sale Price",
  cost_price: "Cost Price",
};

const selectClass =
  "px-2.5 py-1.5 rounded-lg bg-white/5 border border-border text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-colors";

export default function BulkPriceControls({
  selectedCount,
  onApply,
}: BulkPriceControlsProps) {
  const [field, setField] = useState<PriceField>("price");
  const [mode, setMode] = useState<AdjustMode>("amount");
  const [value, setValue] = useState("");
  const [round, setRound] = useState<RoundDirection>("none");
  const [roundTo, setRoundTo] = useState<RoundTo>(1);

  const handleApply = useCallback(() => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue === 0) return;
    onApply({ field, mode, value: numValue, round, roundTo });
    setValue("");
  }, [field, mode, value, round, roundTo, onApply]);

  const disabled = selectedCount === 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        <h3 className="text-sm font-semibold">Bulk Price Adjustment</h3>
        <span className="text-xs text-muted ml-auto">
          {selectedCount > 0
            ? `${selectedCount} product${selectedCount !== 1 ? "s" : ""} selected`
            : "Select products below to adjust"}
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Field selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Field</label>
          <select
            value={field}
            onChange={(e) => setField(e.target.value as PriceField)}
            className={selectClass}
            disabled={disabled}
          >
            {Object.entries(fieldLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Adjust by</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as AdjustMode)}
            className={selectClass}
            disabled={disabled}
          >
            <option value="amount">$ Amount</option>
            <option value="percentage">% Percentage</option>
          </select>
        </div>

        {/* Value input */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">
            Value {mode === "percentage" ? "(%)" : "($)"}
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">
              {mode === "percentage" ? "%" : "$"}
            </span>
            <input
              type="number"
              step={mode === "percentage" ? "0.1" : "0.01"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "percentage" ? "e.g. 10 or -5" : "e.g. 50 or -10"}
              disabled={disabled}
              className={`w-40 pl-6 pr-2 py-1.5 rounded-lg text-sm
                bg-white/5 border border-border text-text
                focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                transition-colors placeholder:text-muted/40
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>
        </div>

        {/* Rounding direction */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted">Rounding</label>
          <select
            value={round}
            onChange={(e) => setRound(e.target.value as RoundDirection)}
            className={selectClass}
            disabled={disabled}
          >
            <option value="none">None</option>
            <option value="up">Round Up</option>
            <option value="down">Round Down</option>
          </select>
        </div>

        {/* Round to value */}
        {round !== "none" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted">Round to nearest</label>
            <select
              value={roundTo}
              onChange={(e) => setRoundTo(Number(e.target.value) as RoundTo)}
              className={selectClass}
              disabled={disabled}
            >
              <option value={1}>$1</option>
              <option value={5}>$5</option>
              <option value={10}>$10</option>
            </select>
          </div>
        )}

        {/* Apply button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleApply}
          disabled={disabled || !value || parseFloat(value) === 0}
        >
          Apply
        </Button>
      </div>

      {value && parseFloat(value) !== 0 && selectedCount > 0 && (
        <p className="text-xs text-muted mt-2">
          Will {parseFloat(value) > 0 ? "increase" : "decrease"}{" "}
          <span className="text-text font-medium">{fieldLabels[field]}</span> by{" "}
          <span className="text-text font-medium">
            {mode === "percentage"
              ? `${Math.abs(parseFloat(value))}%`
              : `$${Math.abs(parseFloat(value)).toFixed(2)}`}
          </span>
          {round !== "none" && (
            <>
              {" "}then round {round} to nearest{" "}
              <span className="text-text font-medium">${roundTo}</span>
            </>
          )}
          {" "}for {selectedCount} product{selectedCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
