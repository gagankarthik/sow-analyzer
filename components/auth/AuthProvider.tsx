"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  getAuthUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  type AuthUser,
} from "@/lib/auth/cognito";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    try {
      const u = await getAuthUser();
      setUser(u);
      setStatus(u ? "authenticated" : "unauthenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const u = await cognitoSignIn(email, password);
      setUser(u);
      setStatus("authenticated");
      return u;
    },
    [],
  );

  const signOut = useCallback(() => {
    cognitoSignOut();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, refresh }),
    [user, status, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

/** Initials for an avatar from a name or email. */
export function initialsOf(user: Pick<AuthUser, "name" | "email"> | null): string {
  if (!user) return "?";
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase() || "?";
  }
  return (user.email?.[0] ?? "?").toUpperCase();
}
