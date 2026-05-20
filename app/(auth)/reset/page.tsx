"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forgotPassword, confirmForgotPassword } from "@/lib/auth/cognito";
import {
  AuthHeading,
  Field,
  FormError,
  PasswordInput,
  PasswordRules,
  passwordIsStrong,
} from "@/components/auth/fields";
import { Loader2 } from "@/components/ui/icons";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your account email.");
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      toast.success(
        res.destination ? `Code sent to ${res.destination}.` : "Reset code sent.",
      );
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start password reset.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return setError("Enter the code from your email.");
    if (!passwordIsStrong(password)) {
      return setError("Choose a new password that meets all the requirements.");
    }
    setLoading(true);
    try {
      await confirmForgotPassword(email.trim().toLowerCase(), code, password);
      toast.success("Password updated. You can sign in now.");
      router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your password.");
      setLoading(false);
    }
  }

  if (step === "request") {
    return (
      <>
        <AuthHeading
          title="Reset your password"
          subtitle="Enter your email and we'll send you a code to set a new password."
        />
        <form onSubmit={onRequest} className="space-y-4" noValidate>
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
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="h-10 w-full text-[13.5px]"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Send reset code"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Choose a new password"
        subtitle={`Enter the code sent to ${email} and your new password.`}
      />
      <form onSubmit={onConfirm} className="space-y-4" noValidate>
        <FormError message={error} />
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
        <Field label="New password" htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Create a strong password"
          />
        </Field>
        {password.length > 0 && <PasswordRules value={password} />}
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
          className="h-10 w-full text-[13.5px]"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : "Update password"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => setStep("request")}
        className="mt-5 w-full text-center text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        Use a different email
      </button>
    </>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <ResetForm />
    </Suspense>
  );
}
