"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type UserRole = "admin" | "user";

export interface SubscriptionInfo {
  entitled: boolean;
  is_admin: boolean;
  status: string | null;
  plan: "monthly" | "yearly" | null;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  has_stripe_customer: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  subscription: SubscriptionInfo | null;
  subscriptionLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshRole: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const supabase = createClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Fetch role from profile API
  const fetchRole = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRole((data.role as UserRole) || "user");
      } else {
        setRole("user");
      }
    } catch {
      setRole("user");
    }
  }, []);

  // Fetch subscription status
  const fetchSubscription = useCallback(async (accessToken: string) => {
    setSubscriptionLoading(true);
    try {
      const res = await fetch("/api/subscription", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setSubscription((await res.json()) as SubscriptionInfo);
      } else {
        setSubscription(null);
      }
    } catch {
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        fetchRole(session.access_token);
        fetchSubscription(session.access_token);
      } else {
        setSubscriptionLoading(false);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.access_token) {
        fetchRole(session.access_token);
        fetchSubscription(session.access_token);
      } else {
        setRole(null);
        setSubscription(null);
        setSubscriptionLoading(false);
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [fetchRole, fetchSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Signup failed: no user returned");
    return data.user;
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
  };

  const getIdToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  // Allow manual role refresh (e.g., after bootstrapping admin)
  const refreshRole = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetchRole(session.access_token);
    }
  }, [fetchRole]);

  const refreshSubscription = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await fetchSubscription(session.access_token);
    }
  }, [fetchSubscription]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isAdmin: role === "admin",
        subscription,
        subscriptionLoading,
        signIn,
        signUp,
        signOut: signOutUser,
        getIdToken,
        refreshRole,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
