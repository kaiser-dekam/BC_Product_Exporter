"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

const features = [
  {
    icon: "📊",
    title: "CSV Export",
    description:
      "Export your BigCommerce product data to fully customizable CSV files with any field combination.",
  },
  {
    icon: "📚",
    title: "Sales Books",
    description:
      "Generate polished, print-ready PDF sales books directly from your product catalog.",
  },
  {
    icon: "🔄",
    title: "Sync & Summarize",
    description:
      "Keep your product library in sync and enrich it with AI-generated summaries.",
  },
];

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-accent to-accent-2 grid place-items-center text-[#0b1020] font-extrabold text-[15px]">
            B
          </div>
          <span className="font-bold tracking-wide text-lg">BigCSV.co</span>
        </div>
        <Link
          href="/signup"
          className="text-sm text-muted hover:text-text transition-colors"
        >
          Create account →
        </Link>
      </header>

      {/* Main split layout */}
      <main className="flex-1 grid lg:grid-cols-2">
        {/* Left: Hero & features */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-16">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-6">
              BigCommerce Product Tools
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
              Manage your{" "}
              <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">
                product catalog
              </span>{" "}
              like a pro
            </h1>

            <p className="text-muted text-lg mb-10 leading-relaxed">
              Export CSVs, generate sales books, and keep your BigCommerce
              products organized — all from one dashboard.
            </p>

            <div className="flex flex-col gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-4 bg-card/50 border border-border rounded-xl p-4"
                >
                  <span className="text-2xl leading-none mt-0.5">{f.icon}</span>
                  <div>
                    <p className="font-semibold text-sm mb-0.5">{f.title}</p>
                    <p className="text-muted text-sm leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Login form */}
        <div className="flex items-center justify-center px-8 py-16 lg:border-l border-border">
          <Card className="w-full max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-accent to-accent-2 grid place-items-center text-[#0b1020] font-extrabold text-[15px]">
                B
              </div>
              <span className="font-bold tracking-wide text-lg">
                BigCSV.co
              </span>
            </div>

            <h2 className="text-xl font-semibold mb-1">Sign in</h2>
            <p className="text-muted text-sm mb-6">
              Enter your credentials to access your account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />

              {error && (
                <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" loading={submitting} className="w-full mt-2">
                Sign in
              </Button>
            </form>

            <p className="text-sm text-muted mt-4 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-accent hover:underline">
                Sign up
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
