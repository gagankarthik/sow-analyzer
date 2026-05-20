"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthError } from "@/lib/auth/cognito";
import {
  AuthHeading,
  Field,
  FormError,
  PasswordInput,
} from "@/components/auth/fields";
import { Loader2 } from "@/components/ui/icons";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only allow same-origin relative paths to prevent open-redirect
  // (e.g. ?redirect=//evil.com or ?redirect=https://evil.com).
  const rawRedirect = params.get("redirect");
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace(redirectTo);
    } catch (err) {
      if (err instanceof AuthError && err.code === "UserNotConfirmedException") {
        router.push(`/confirm?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHeading
        title="Sign in to Blue-IQ"
        subtitle="Welcome back. Enter your credentials to access your workspace."
      />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@company.com"
            className="h-10"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          hint={
            <Link
              href={`/reset${email ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ""}`}
              className="text-[11.5px] font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]"
            >
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="h-10 w-full text-[13.5px]"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        New to Blue-IQ?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <LoginForm />
    </Suspense>
  );
}
