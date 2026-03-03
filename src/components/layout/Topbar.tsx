"use client";

import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

export default function Topbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-border backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/5 border border-border text-xs text-muted">
          BigCommerce Tools
        </span>
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-muted">{user.email}</span>
        )}
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
