"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";

interface Book {
  id: string;
  title: string;
  updated_at: string;
  status: "draft" | "published";
}

interface Snapshot {
  id: string;
  label: string;
  product_count: number;
  created_at: string;
}

interface DashboardData {
  productCount: number | null;
  summarizedCount: number | null;
  books: Book[];
  snapshots: Snapshot[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function SkeletonLine({ width = "full" }: { width?: string }) {
  return (
    <div className={`h-3 bg-border/60 rounded animate-pulse w-${width}`} />
  );
}

export default function DashboardPage() {
  const { getIdToken } = useAuth();
  const [data, setData] = useState<DashboardData>({
    productCount: null,
    summarizedCount: null,
    books: [],
    snapshots: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = await getIdToken();
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [productsRes, booksRes, snapshotsRes] = await Promise.all([
          fetch("/api/products?limit=1", { headers }),
          fetch("/api/books", { headers }),
          fetch("/api/snapshots", { headers }),
        ]);

        const [productsData, booksData, snapshotsData] = await Promise.all([
          productsRes.ok ? productsRes.json() : null,
          booksRes.ok ? booksRes.json() : null,
          snapshotsRes.ok ? snapshotsRes.json() : null,
        ]);

        setData({
          productCount: productsData?.total ?? null,
          summarizedCount: null,
          books: (booksData?.books ?? []).slice(0, 3),
          snapshots: (snapshotsData?.snapshots ?? []).slice(0, 3),
        });
      } catch {
        // silently fail — dashboard still renders without data
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [getIdToken]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted">Choose a tool to get started.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Product Library */}
        <Link href="/product-library">
          <Card className="h-full hover:border-accent/30 transition-colors cursor-pointer flex flex-col">
            <div className="text-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Product Library</h3>
            <p className="text-sm text-muted mb-4">Sync your BigCommerce catalog and use AI to summarize product descriptions.</p>
            <div className="mt-auto pt-3 border-t border-border">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonLine width="3/4" />
                </div>
              ) : data.productCount === null ? (
                <p className="text-xs text-muted italic">No products synced yet</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent">{data.productCount.toLocaleString()}</span>
                  <span className="text-xs text-muted">products in catalog</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        {/* CSV Exporter */}
        <Link href="/csv-exporter">
          <Card className="h-full hover:border-accent/30 transition-colors cursor-pointer flex flex-col">
            <div className="text-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">CSV Exporter</h3>
            <p className="text-sm text-muted mb-4">Pull product data from BigCommerce and export to CSV with custom fields and ordering.</p>
            <div className="mt-auto pt-3 border-t border-border">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonLine width="2/3" />
                </div>
              ) : data.productCount === null ? (
                <p className="text-xs text-muted italic">Sync products to export</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent">{data.productCount.toLocaleString()}</span>
                  <span className="text-xs text-muted">products ready to export</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        {/* Price Adjuster */}
        <Link href="/price-adjuster">
          <Card className="h-full hover:border-accent/30 transition-colors cursor-pointer flex flex-col">
            <div className="text-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Price Adjuster</h3>
            <p className="text-sm text-muted mb-4">View and bulk-edit product prices, sale prices, and cost prices in one place.</p>
            <div className="mt-auto pt-3 border-t border-border">
              {loading ? (
                <div className="space-y-2">
                  <SkeletonLine width="1/2" />
                </div>
              ) : data.productCount === null ? (
                <p className="text-xs text-muted italic">Sync products to adjust prices</p>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent">{data.productCount.toLocaleString()}</span>
                  <span className="text-xs text-muted">products available</span>
                </div>
              )}
            </div>
          </Card>
        </Link>

        {/* Time Capsule */}
        <Link href="/time-capsule">
          <Card className="h-full hover:border-accent/30 transition-colors cursor-pointer flex flex-col">
            <div className="text-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Time Capsule</h3>
            <p className="text-sm text-muted mb-4">Snapshot your product data at any point in time and browse historical backups.</p>
            <div className="mt-auto pt-3 border-t border-border space-y-1.5">
              {loading ? (
                <>
                  <SkeletonLine width="full" />
                  <SkeletonLine width="4/5" />
                </>
              ) : data.snapshots.length === 0 ? (
                <p className="text-xs text-muted italic">No snapshots yet</p>
              ) : (
                data.snapshots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate">{s.label}</span>
                    <span className="text-xs text-muted shrink-0">{s.product_count.toLocaleString()} products</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Link>

        {/* Sales Book Builder */}
        <Link href="/books">
          <Card className="h-full hover:border-accent/30 transition-colors cursor-pointer flex flex-col">
            <div className="text-accent mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Sales Book Builder</h3>
            <p className="text-sm text-muted mb-4">Arrange products into professional, printable PDF sales books with drag-and-drop.</p>
            <div className="mt-auto pt-3 border-t border-border space-y-1.5">
              {loading ? (
                <>
                  <SkeletonLine width="full" />
                  <SkeletonLine width="3/4" />
                </>
              ) : data.books.length === 0 ? (
                <p className="text-xs text-muted italic">No books created yet</p>
              ) : (
                data.books.map((book) => (
                  <div key={book.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground truncate">{book.title}</span>
                    <span className="text-xs text-muted shrink-0">{timeAgo(book.updated_at)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
