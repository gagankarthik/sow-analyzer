"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth/cognito";
import {
  AuthHeading,
  Field,
  FormError,
  PasswordInput,
  PasswordRules,
  passwordIsStrong,
} from "@/components/auth/fields";
import { Loader2 } from "@/components/ui/icons";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Enter your name.");
    if (!emailValid) return setError("Enter a valid email address.");
    if (!passwordIsStrong(password)) {
      return setError("Choose a password that meets all the requirements below.");
    }

    setLoading(true);
    try {
      const res = await signUp({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });
      const target = `/confirm?email=${encodeURIComponent(email.trim().toLowerCase())}`;
      if (res.userConfirmed) {
        toast.success("Account created. You can sign in now.");
        router.push("/login");
      } else {
        toast.success(
          res.destination
            ? `We sent a verification code to ${res.destination}.`
            : "We sent you a verification code.",
        );
        router.push(target);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHeading
        title="Create your account"
        subtitle="Start analyzing contracts with Sonar in minutes."
      />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <Field label="Full name" htmlFor="name">
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Jane Cooper"
            className="h-10"
          />
        </Field>

        <Field label="Work email" htmlFor="email">
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

        <Field label="Password" htmlFor="password">
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
          {loading ? <Loader2 size={15} className="animate-spin" /> : "Create account"}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground leading-relaxed">
          By creating an account you agree to the Terms of Service and Privacy
          Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--brand-primary-600)] hover:text-[var(--brand-primary-700)]"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
