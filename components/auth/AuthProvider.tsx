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
  signOut: (opts?: { everywhere?: boolean }) => void;
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

  // Read the session once on mount. The state updates happen after the awaited
  // lookup, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session read on mount
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

  // Finish signing out (tokens, cookie, stored data) before the state change
  // that sends the shell to /login; otherwise the unload can cut it short.
  const signOut = useCallback((opts?: { everywhere?: boolean }) => {
    void (async () => {
      try {
        await cognitoSignOut(opts);
      } finally {
        setUser(null);
        setStatus("unauthenticated");
        router.replace("/login");
      }
    })();
  }, [router]);

  // Signing in or out in another tab changes the stored Cognito session:
  // re-read it here so this tab follows.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith("CognitoIdentityServiceProvider.")) void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signIn, signOut, refresh }),
    [user, status, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** A fixed signed-in session, for the dev-only /showcase screens that render
 *  real app pages with sample data. Never mounted by the app itself. */
export function StaticAuthProvider({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({ user, status: "authenticated", signIn: async () => user, signOut: () => {}, refresh: async () => {} }),
    [user],
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
