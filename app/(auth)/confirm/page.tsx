"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { confirmSignUp, resendConfirmationCode } from "@/lib/auth/cognito";
import { AuthHeading, Field, FormError } from "@/components/auth/fields";
import { Loader2, Mail, AlertTriangle } from "@/components/ui/icons";

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  // The email is fixed by the sign-up redirect (/confirm?email=…) — it's the
  // account we're verifying, so it's shown read-only, never edited here.
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // No email in the URL — there's nothing to verify against. Send them back
  // rather than offer an editable field.
  if (!email) {
    return (
      <>
        <AuthHeading
          title="Verify your email"
          subtitle="We couldn't tell which account to verify."
        />
        <FormError message="Start from sign-up so we know which email to confirm." />
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          <Link
            href="/signup"
            className="font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]"
          >
            Back to sign up
          </Link>
        </p>
      </>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return setError("Enter the verification code from your email.");
    setLoading(true);
    try {
      await confirmSignUp(email, code);
      toast.success("Email verified. You can sign in now.");
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify your email.");
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setError(null);
    try {
      await resendConfirmationCode(email);
      toast.success("A new code is on its way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <AuthHeading
        title="Verify your email"
        subtitle="Enter the 6-digit code we emailed you to activate your account."
      />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        {/* Read-only — the account being verified, not an editable field. */}
        <div className="space-y-1.5">
          <span className="text-[12.5px] font-medium text-foreground">Email</span>
          <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-[13.5px] text-foreground">
            <Mail size={14} className="shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate" title={email}>{email}</span>
          </div>
        </div>

        <Field label="Verification code" htmlFor="code">
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="h-10 tracking-[0.4em] font-mono text-center"
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="h-10 w-full text-[13.5px]"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : "Verify & continue"}
        </Button>
      </form>

      {/* Spam warning — the #1 reason the code looks "missing". */}
      <div
        role="note"
        className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground"
      >
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
        <span>
          The code can take a minute to arrive.{" "}
          <span className="font-medium text-foreground">Check your spam or junk folder</span> — if
          it&apos;s still not there, resend below.
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between text-[12.5px]">
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)] disabled:opacity-50"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <ConfirmForm />
    </Suspense>
  );
}
