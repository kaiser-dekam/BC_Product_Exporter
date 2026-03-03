"use client";

import Input from "@/components/ui/Input";

interface CustomDomainInputProps {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
}

export default function CustomDomainInput({
  visible,
  value,
  onChange,
}: CustomDomainInputProps) {
  if (!visible) return null;

  return (
    <div className="max-w-md">
      <Input
        label="Custom Domain"
        placeholder="e.g. https://www.mystore.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted mt-1.5">
        Prepend this domain to product URLs in the Custom URL column.
      </p>
    </div>
  );
}
