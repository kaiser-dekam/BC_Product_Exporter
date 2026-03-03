"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface BookCardProps {
  book: {
    id: string;
    title: string;
    description: string;
    status: "draft" | "published";
    page_count: number;
    sections?: Array<{ id: string; title: string; products: unknown[] }>;
    updated_at?: { _seconds?: number; seconds?: number };
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function BookCard({ book, onEdit, onDelete }: BookCardProps) {
  const sectionCount = book.sections?.length || 0;
  const productCount = book.sections?.reduce((sum, s) => sum + (s.products?.length || 0), 0) || 0;
  const updatedAt = book.updated_at?._seconds || book.updated_at?.seconds;
  const dateStr = updatedAt
    ? new Date(updatedAt * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold truncate">{book.title}</h3>
          {book.description && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{book.description}</p>
          )}
        </div>
        <Badge variant={book.status === "published" ? "success" : "default"}>
          {book.status}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted">
        <span>{sectionCount} section{sectionCount !== 1 ? "s" : ""}</span>
        <span>{productCount} product{productCount !== 1 ? "s" : ""}</span>
        {dateStr && <span>Updated {dateStr}</span>}
      </div>

      <div className="flex items-center gap-2 mt-1">
        <Button size="sm" onClick={() => onEdit(book.id)}>
          Edit Book
        </Button>
        <Button size="sm" variant="danger" onClick={() => onDelete(book.id)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}
