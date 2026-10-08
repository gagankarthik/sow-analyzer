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
  SessionUnavailableError,
  getAuthUser,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  type AuthUser,
} from "@/lib/auth/cognito";

/** Renew this long before the ID token expires. */
const RENEW_BEFORE_MS = 5 * 60_000;
/** Retry delay when Cognito could not be reached. */
const RETRY_MS = 15_000;

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

  const [retryTick, setRetryTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const u = await getAuthUser();
      setUser(u);
      setStatus(u ? "authenticated" : "unauthenticated");
    } catch (err) {
      // Cognito unreachable: not a sign-out. Keep what we have and try again.
      if (err instanceof SessionUnavailableError) {
        window.setTimeout(() => setRetryTick((n) => n + 1), RETRY_MS);
        return;
      }
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  // Read the session once on mount. The state updates happen after the awaited
  // lookup, not synchronously in the effect body.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async session read on mount (and on retry)
    void refresh();
  }, [refresh, retryTick]);

  // Renew the tokens a few minutes before the ID token expires, so the session
  // cookie and API calls never carry an expired token.
  const exp = user?.exp ?? 0;
  useEffect(() => {
    if (status !== "authenticated" || !exp) return;
    const wait = Math.max(5_000, exp * 1000 - Date.now() - RENEW_BEFORE_MS);
    const timer = window.setTimeout(() => void refresh(), wait);
    return () => window.clearTimeout(timer);
  }, [status, exp, refresh]);

  // A laptop waking from sleep or a tab coming back can be past expiry
  // (timers do not run while asleep): re-check the session right away.
  useEffect(() => {
    if (status !== "authenticated") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && exp * 1000 - Date.now() < RENEW_BEFORE_MS) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [status, exp, refresh]);

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
