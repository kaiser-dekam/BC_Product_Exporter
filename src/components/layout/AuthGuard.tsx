"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/ui/Spinner";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, subscription, subscriptionLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // The billing page must be reachable even when the user has no active
  // subscription — that's where they go to start one.
  const isBillingPage = pathname?.startsWith("/billing") ?? false;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (subscriptionLoading) return;

    if (!subscription?.entitled && !isBillingPage) {
      router.replace("/billing");
    }
  }, [user, loading, subscription, subscriptionLoading, isBillingPage, router]);

  if (loading || (user && subscriptionLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;
  if (!subscription?.entitled && !isBillingPage) return null;

  return <>{children}</>;
}
