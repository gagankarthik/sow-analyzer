"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  AuthHeading,
  EMAIL_PATTERN,
  FormAlert,
  FormNotice,
  PasswordField,
  SubmitButton,
  TextField,
  authErrorCode,
  authLinkClass,
  commonAuthMessage,
  focusField,
} from "@/components/auth/fields";

// Set by the confirm and sign-up screens when they hand over to sign in.
const NOTICES: Record<string, string> = {
  verified: "Email verified. Sign in to continue.",
  created: "Account created. Sign in to continue.",
};

const WRONG_CREDENTIALS = new Set(["NotAuthorizedException", "UserNotFoundException"]);

function emailProblem(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter an email address like name@company.com.";
  return undefined;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Only same-origin paths are followed, so the link cannot be used to bounce a
  // freshly signed-in user to another site (see lib/auth/redirect).
  const redirectTo = safeRedirectPath(params.get("redirect"));
  const notice = NOTICES[params.get("notice") ?? ""];
  const { signIn } = useAuth();

  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();
  const resetHref = cleanEmail ? `/reset?email=${encodeURIComponent(cleanEmail)}` : "/reset";
  const emailError = emailProblem(email);
  const passwordError = password ? undefined : "Enter your password.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setChecked({ email: true, password: true });
    if (emailError) return focusField("email");
    if (passwordError) return focusField("password");

    setLoading(true);
    try {
      await signIn(cleanEmail, password);
      // Hard navigation (not router.replace): the session cookie was just set,
      // but the client router may hold a cached middleware redirect from when
      // this page loaded unauthenticated. A full navigation re-runs the proxy
      // gate with the cookie present, so we land on the dashboard first try.
      window.location.assign(redirectTo);
    } catch (err) {
      const code = authErrorCode(err);
      if (code === "UserNotConfirmedException") {
        router.push(`/confirm?email=${encodeURIComponent(cleanEmail)}`);
        return;
      }
      if (WRONG_CREDENTIALS.has(code)) {
        setFormError("That email and password do not match. Check both and try again.");
      } else if (code === "PasswordResetRequiredException") {
        setFormError(
          <>
            This account needs a new password before you can sign in.{" "}
            <Link href={resetHref} className="font-semibold underline underline-offset-4">
              Reset your password
            </Link>
          </>,
        );
      } else {
        setFormError(
          commonAuthMessage(err, err instanceof Error ? err.message : "We could not sign you in. Try again."),
        );
      }
      setLoading(false);
      focusField("password");
    }
  }

  return (
    <>
      <AuthHeading title="Sign in" subtitle="Use the email and password for your Blue-IQ Govern account." />

      {notice && <FormNotice className="mb-6">{notice}</FormNotice>}

      <form onSubmit={onSubmit} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setChecked((c) => ({ ...c, email: email.trim() !== "" }))}
          error={checked.email ? emailError : undefined}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@company.com"
          required
        />

        <PasswordField
          id="password"
          label="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={checked.password ? passwordError : undefined}
          autoComplete="current-password"
          required
          hint={
            <Link href={resetHref} className={`${authLinkClass} -my-3 inline-flex h-11 items-center text-sm`}>
              Forgot password?
            </Link>
          }
        />

        <div className="pt-3">
          <SubmitButton loading={loading} loadingLabel="Signing in">
            Sign in
          </SubmitButton>
        </div>
        <FormAlert message={formError} />
      </form>

      <p className="text-base text-[var(--ink-600)]">
        No account yet?{" "}
        <Link href="/signup" className={authLinkClass}>
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <LoginForm />
    </Suspense>
  );
}
