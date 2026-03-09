"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

type UserRole = "admin" | "user";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  // Fetch role from profile API
  const fetchRole = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchRole(firebaseUser);
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
  };

  const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  // Allow manual role refresh (e.g., after bootstrapping admin)
  const refreshRole = useCallback(async () => {
    if (auth.currentUser) {
      await fetchRole(auth.currentUser);
    }
  }, [fetchRole]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        role,
        isAdmin: role === "admin",
        signIn,
        signUp,
        signOut: signOutUser,
        getIdToken,
        refreshRole,
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
