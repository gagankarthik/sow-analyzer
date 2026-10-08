"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUp, resendConfirmationCode } from "@/lib/auth/cognito";
import {
  AuthHeading,
  CodeField,
  FormAlert,
  FormNotice,
  SubmitButton,
  authErrorCode,
  authLinkClass,
  commonAuthMessage,
  focusField,
  primaryPillClass,
  secondaryPillClass,
  useCooldown,
} from "@/components/auth/fields";

const RESEND_WAIT_SECONDS = 30;

function ConfirmForm() {
  const router = useRouter();
  const params = useSearchParams();
  // The email comes from sign up (or from a sign-in attempt on an unverified
  // account). It is the account being verified, so it is shown, not edited.
  const email = (params.get("email") ?? "").trim().toLowerCase();
  // Sign up has just sent a code; a redirect from sign in has not.
  const codeJustSent = params.get("sent") === "1";
  const loginHref = `/login?email=${encodeURIComponent(email)}`;

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(RESEND_WAIT_SECONDS, codeJustSent);

  if (!email) {
    return (
      <>
        <AuthHeading
          title="Verify your email"
          subtitle="This link is missing the email address to verify. Start again from sign up, or sign in if you already verified."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className={primaryPillClass}>
            Go to sign up
          </Link>
          <Link href="/login" className={`${secondaryPillClass} w-full`}>
            Sign in
          </Link>
        </div>
      </>
    );
  }

  const alreadyVerified = (
    <>
      This email is already verified.{" "}
      <Link href={loginHref} className="font-semibold underline underline-offset-4">
        Sign in
      </Link>
    </>
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResent(false);
    if (code.length !== 6) {
      setCodeError(code ? "The code has 6 digits." : "Enter the 6-digit code from the email.");
      return focusField("code");
    }

    setLoading(true);
    try {
      await confirmSignUp(email, code);
      // Verifying does not create a session, so the next step is sign in.
      router.push(`${loginHref}&notice=verified`);
    } catch (err) {
      const errorCode = authErrorCode(err);
      if (errorCode === "CodeMismatchException") {
        setCodeError("That code is not correct. Check the email and try again.");
        focusField("code");
      } else if (errorCode === "ExpiredCodeException") {
        setCodeError("That code has expired. Send a new code below.");
        focusField("code");
      } else if (errorCode === "NotAuthorizedException") {
        // Cognito's answer when the account is no longer waiting on a code.
        setFormError(alreadyVerified);
      } else {
        setFormError(
          commonAuthMessage(err, err instanceof Error ? err.message : "We could not verify your email. Try again."),
        );
      }
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setFormError(null);
    setCodeError(null);
    setResent(false);
    try {
      await resendConfirmationCode(email);
      setResent(true);
      setCode("");
      cooldown.start();
      focusField("code");
    } catch (err) {
      setFormError(
        authErrorCode(err) === "InvalidParameterException"
          ? alreadyVerified
          : commonAuthMessage(err, err instanceof Error ? err.message : "We could not send a new code. Try again."),
      );
    } finally {
      setResending(false);
    }
  }

  const waiting = cooldown.left > 0;

  return (
    <>
      <AuthHeading
        title="Verify your email"
        subtitle={
          <>
            {codeJustSent ? "We sent a 6-digit code to " : "Enter the 6-digit code we emailed to "}
            <span className="break-all font-medium text-foreground">{email}</span>
            {codeJustSent ? ". Enter it below to finish creating your account." : ", or send a new one below."}{" "}
            <Link href="/signup" className={authLinkClass}>
              Use a different email
            </Link>
          </>
        }
      />

      <form onSubmit={onSubmit} noValidate>
        <CodeField
          value={code}
          onChange={(next) => {
            setCode(next);
            setCodeError(null);
          }}
          error={codeError ?? undefined}
          help="It can take a minute to arrive. Check your spam folder too."
          autoFocus
          required
        />

        <div className="pt-3">
          <SubmitButton loading={loading} loadingLabel="Verifying">
            Verify email
          </SubmitButton>
        </div>
        <FormAlert message={formError} />
      </form>

      <div className="border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-base text-[var(--ink-600)]">No code in your inbox?</p>
          <button
            type="button"
            onClick={onResend}
            disabled={waiting || resending}
            className={`${secondaryPillClass} h-11 px-5 text-sm tabular-nums`}
          >
            {resending ? "Sending…" : waiting ? `Resend in ${cooldown.left}s` : "Resend code"}
          </button>
        </div>
        <div className="mt-4 min-h-11">{resent && <FormNotice>New code sent. Use the most recent email.</FormNotice>}</div>
      </div>
    </>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <ConfirmForm />
    </Suspense>
  );
}
