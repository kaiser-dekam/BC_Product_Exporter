"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import BookCard from "@/components/books/BookCard";

interface Book {
  id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  page_count: number;
  sections?: Array<{ id: string; title: string; products: unknown[] }>;
  updated_at?: { _seconds?: number; seconds?: number };
}

export default function BooksPage() {
  const { getIdToken } = useAuth();
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/books", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load books");
      const data = await res.json();
      setBooks(data.books);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create book");
      const data = await res.json();
      router.push(`/books/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create book");
      setTimeout(() => setError(null), 5000);
    } finally {
      setCreating(false);
    }
  }, [getIdToken, newTitle, router]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;
    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/books/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete book");
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete book");
      setTimeout(() => setError(null), 5000);
    }
  }, [getIdToken]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Sales Books</h1>
          <p className="text-muted text-sm">Create and manage your product sales books.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          + New Book
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-danger/30 bg-danger/5">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {showCreate && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Create New Book</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Book title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} loading={creating} disabled={!newTitle.trim()}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setNewTitle(""); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : books.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <svg className="w-12 h-12 text-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-lg font-semibold mb-2">No Books Yet</h2>
          <p className="text-muted text-sm max-w-md mb-4">
            Create your first sales book to organize your products into a professional catalog.
          </p>
          <Button onClick={() => setShowCreate(true)}>Create Your First Book</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={(id) => router.push(`/books/${id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
