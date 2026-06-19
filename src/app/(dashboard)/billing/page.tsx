"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

type Plan = "monthly" | "yearly";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function BillingPage() {
  const { subscription, subscriptionLoading, getIdToken, refreshSubscription } =
    useAuth();
  const searchParams = useSearchParams();
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After returning from a successful checkout, the webhook may take a beat —
  // refresh subscription state to pick up the new active row.
  useEffect(() => {
    if (searchParams.get("success") === "1") {
      refreshSubscription();
    }
  }, [searchParams, refreshSubscription]);

  const startCheckout = async (plan: Plan) => {
    setError(null);
    setPendingPlan(plan);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPendingPlan(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    setPortalLoading(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open portal");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPortalLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const status = subscription?.status ?? null;
  const isActive =
    status === "active" ||
    status === "trialing" ||
    status === "grandfathered";
  const isPastDue = status === "past_due";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing</h1>
        <p className="text-muted">
          Manage your subscription to Master Product Manager.
        </p>
      </div>

      {searchParams.get("success") === "1" && (
        <Card className="border-green-500/30 bg-green-500/5">
          <p className="text-green-400">
            Thanks! Your subscription is being activated. It may take a few
            seconds to reflect here.
          </p>
        </Card>
      )}
      {searchParams.get("canceled") === "1" && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <p className="text-yellow-400">Checkout canceled. No charge made.</p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {/* Current plan summary */}
      {isActive && (
        <Card>
          <h2 className="text-xl font-semibold mb-3">Current plan</h2>
          {status === "grandfathered" ? (
            <p className="text-muted">
              You have complimentary access as an early user. Thank you!
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Plan</span>
                <span className="font-medium capitalize">
                  {subscription?.plan ?? "—"} (
                  {subscription?.plan === "yearly" ? "$100/year" : "$25/month"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <span className="font-medium capitalize">{status}</span>
              </div>
              {status === "trialing" && subscription?.trial_end && (
                <div className="flex justify-between">
                  <span className="text-muted">Trial ends</span>
                  <span className="font-medium">
                    {formatDate(subscription.trial_end)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">
                  {subscription?.cancel_at_period_end
                    ? "Cancels on"
                    : "Renews on"}
                </span>
                <span className="font-medium">
                  {formatDate(subscription?.current_period_end ?? null)}
                </span>
              </div>
            </div>
          )}
          {subscription?.has_stripe_customer && status !== "grandfathered" && (
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={openPortal}
                loading={portalLoading}
              >
                Manage subscription
              </Button>
            </div>
          )}
        </Card>
      )}

      {isPastDue && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <h2 className="text-xl font-semibold mb-2 text-yellow-400">
            Payment past due
          </h2>
          <p className="text-muted mb-4">
            We couldn&apos;t process your most recent payment. You have a
            3-day grace period — please update your payment method to keep
            access.
          </p>
          <Button
            variant="secondary"
            onClick={openPortal}
            loading={portalLoading}
          >
            Update payment method
          </Button>
        </Card>
      )}

      {/* Plan picker — show whenever the user isn't on an active paid plan. */}
      {!isActive && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Choose a plan
          </h2>
          <p className="text-muted mb-6">
            Both plans include a 14-day free trial. Cancel anytime.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-semibold">Monthly</h3>
                <div className="my-4">
                  <span className="text-4xl font-bold">$25</span>
                  <span className="text-muted">/month</span>
                </div>
                <p className="text-muted text-sm mb-6">
                  Billed monthly. 14-day free trial.
                </p>
                <div className="mt-auto">
                  <Button
                    onClick={() => startCheckout("monthly")}
                    loading={pendingPlan === "monthly"}
                    disabled={pendingPlan !== null}
                    className="w-full"
                  >
                    Start free trial
                  </Button>
                </div>
              </div>
            </Card>
            <Card className="border-accent/40">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Yearly</h3>
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">
                    SAVE 67%
                  </span>
                </div>
                <div className="my-4">
                  <span className="text-4xl font-bold">$100</span>
                  <span className="text-muted">/year</span>
                </div>
                <p className="text-muted text-sm mb-6">
                  Billed annually. 14-day free trial.
                </p>
                <div className="mt-auto">
                  <Button
                    onClick={() => startCheckout("yearly")}
                    loading={pendingPlan === "yearly"}
                    disabled={pendingPlan !== null}
                    className="w-full"
                  >
                    Start free trial
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
