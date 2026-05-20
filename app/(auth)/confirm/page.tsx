"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { confirmSignUp, resendConfirmationCode } from "@/lib/auth/cognito";
import { AuthHeading, Field, FormError } from "@/components/auth/fields";
import { Loader2 } from "@/components/ui/icons";

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter the email you signed up with.");
    if (!code.trim()) return setError("Enter the verification code from your email.");
    setLoading(true);
    try {
      await confirmSignUp(email.trim().toLowerCase(), code);
      toast.success("Email verified. You can sign in now.");
      router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify your email.");
      setLoading(false);
    }
  }

  async function onResend() {
    if (!email.trim()) return setError("Enter your email first, then resend.");
    setResending(true);
    setError(null);
    try {
      await resendConfirmationCode(email.trim().toLowerCase());
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

        <Field label="Verification code" htmlFor="code">
          <Input
            id="code"
            inputMode="numeric"
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
