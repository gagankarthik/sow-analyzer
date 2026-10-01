"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { forgotPassword, confirmForgotPassword } from "@/lib/auth/cognito";
import {
  AuthHeading,
  CodeField,
  EMAIL_PATTERN,
  FormAlert,
  FormNotice,
  PasswordField,
  PasswordRules,
  Steps,
  SubmitButton,
  TextField,
  authErrorCode,
  authLinkClass,
  commonAuthMessage,
  focusField,
  passwordIsStrong,
  primaryPillClass,
  secondaryPillClass,
  useCooldown,
} from "@/components/auth/fields";

const STEPS = ["Email", "New password"];
const RESEND_WAIT_SECONDS = 30;

// Cognito can answer "no such account" or "no verified email" here. Both are
// treated like success so the screen never says whether an account exists.
const HIDDEN_REQUEST_ERRORS = new Set(["UserNotFoundException", "InvalidParameterException"]);

/** Ask for a reset code. Resolves for unknown accounts too; throws otherwise. */
async function requestCode(email: string): Promise<void> {
  try {
    await forgotPassword(email);
  } catch (err) {
    if (!HIDDEN_REQUEST_ERRORS.has(authErrorCode(err))) throw err;
  }
}

function emailProblem(email: string): string | undefined {
  if (!email.trim()) return "Enter the email address for your account.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter an email address like name@company.com.";
  return undefined;
}

function RequestStep({
  initialEmail,
  onSent,
}: {
  initialEmail: string;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [checked, setChecked] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailError = emailProblem(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setChecked(true);
    if (emailError) return focusField("email");

    const clean = email.trim().toLowerCase();
    setLoading(true);
    try {
      await requestCode(clean);
      onSent(clean);
    } catch (err) {
      setFormError(
        commonAuthMessage(err, err instanceof Error ? err.message : "We could not send a code. Try again."),
      );
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHeading
        title="Reset your password"
        subtitle="Enter your account email and we will send a 6-digit code to set a new password."
      />
      <form onSubmit={onSubmit} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setChecked(email.trim() !== "")}
          error={checked ? emailError : undefined}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@company.com"
          required
        />
        <div className="pt-3">
          <SubmitButton loading={loading} loadingLabel="Sending code">
            Send code
          </SubmitButton>
        </div>
        <FormAlert message={formError} />
      </form>
      <p className="text-base text-[var(--ink-600)]">
        Remembered it?{" "}
        <Link href="/login" className={authLinkClass}>
          Back to sign in
        </Link>
      </p>
    </>
  );
}

type FieldName = "code" | "password" | "confirm";
type Errors = Partial<Record<FieldName, string>>;

const ORDER: FieldName[] = ["code", "password", "confirm"];

function validate(values: Record<FieldName, string>): Errors {
  const errors: Errors = {};
  if (!values.code) errors.code = "Enter the 6-digit code from the email.";
  else if (values.code.length !== 6) errors.code = "The code has 6 digits.";
  if (!values.password) errors.password = "Enter a new password.";
  else if (!passwordIsStrong(values.password)) errors.password = "The password does not meet every requirement below.";
  if (!values.confirm) errors.confirm = "Enter the new password again.";
  else if (values.confirm !== values.password) errors.confirm = "The two passwords do not match.";
  return errors;
}

function NewPasswordStep({
  email,
  onChangeEmail,
  onDone,
}: {
  email: string;
  onChangeEmail: () => void;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<FieldName, string>>({ code: "", password: "", confirm: "" });
  const [checked, setChecked] = useState<Partial<Record<FieldName, boolean>>>({});
  // Errors the server reported for a field; cleared when that field is edited.
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCooldown(RESEND_WAIT_SECONDS, true);

  const problems = validate(values);
  const errorFor = (field: FieldName) => serverErrors[field] ?? (checked[field] ? problems[field] : undefined);

  function set(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setServerErrors((s) => ({ ...s, [field]: undefined }));
  }
  const markChecked = (field: FieldName) => () =>
    setChecked((c) => ({ ...c, [field]: c[field] || values[field] !== "" }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setResent(false);
    setChecked({ code: true, password: true, confirm: true });
    const firstInvalid = ORDER.find((f) => problems[f]);
    if (firstInvalid) return focusField(firstInvalid);

    setLoading(true);
    try {
      await confirmForgotPassword(email, values.code, values.password);
      onDone();
    } catch (err) {
      const code = authErrorCode(err);
      if (code === "CodeMismatchException" || code === "UserNotFoundException") {
        setServerErrors({ code: "That code is not correct. Check the email and try again." });
        focusField("code");
      } else if (code === "ExpiredCodeException") {
        setServerErrors({ code: "That code has expired or is no longer valid. Send a new code below." });
        focusField("code");
      } else if (code === "InvalidPasswordException") {
        setServerErrors({ password: "This password was not accepted. Try a longer or less common one." });
        focusField("password");
      } else {
        setFormError(
          commonAuthMessage(err, err instanceof Error ? err.message : "We could not update your password. Try again."),
        );
      }
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setFormError(null);
    setResent(false);
    try {
      await requestCode(email);
      set("code", "");
      setResent(true);
      cooldown.start();
      focusField("code");
    } catch (err) {
      setFormError(
        commonAuthMessage(err, err instanceof Error ? err.message : "We could not send a new code. Try again."),
      );
    } finally {
      setResending(false);
    }
  }

  const waiting = cooldown.left > 0;

  return (
    <>
      <AuthHeading
        title="Set a new password"
        subtitle={
          <>
            If an account exists for <span className="break-all font-medium text-foreground">{email}</span>, we sent
            it a 6-digit code. Enter the code and choose a new password.{" "}
            <button type="button" onClick={onChangeEmail} className={authLinkClass}>
              Use a different email
            </button>
          </>
        }
      />
      <form onSubmit={onSubmit} noValidate>
        <CodeField
          value={values.code}
          onChange={(next) => set("code", next)}
          onBlur={markChecked("code")}
          error={errorFor("code")}
          help="It can take a minute to arrive. Check your spam folder too."
          autoFocus
          required
        />
        <PasswordField
          id="password"
          label="New password"
          name="new-password"
          value={values.password}
          onChange={(e) => set("password", e.target.value)}
          onBlur={markChecked("password")}
          error={errorFor("password")}
          autoComplete="new-password"
          describedBy="password-rules"
          required
        />
        <PasswordRules id="password-rules" value={values.password} flagUnmet={Boolean(checked.password)} />
        <PasswordField
          id="confirm"
          label="Confirm new password"
          name="confirm-password"
          value={values.confirm}
          onChange={(e) => set("confirm", e.target.value)}
          onBlur={markChecked("confirm")}
          error={errorFor("confirm")}
          autoComplete="new-password"
          required
        />

        <div className="pt-3">
          <SubmitButton loading={loading} loadingLabel="Updating password">
            Update password
          </SubmitButton>
        </div>
        <FormAlert message={formError} />
      </form>

      <div className="border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-base text-[var(--ink-600)]">No code, or it expired?</p>
          <button
            type="button"
            onClick={onResend}
            disabled={waiting || resending}
            className={`${secondaryPillClass} h-11 px-5 text-sm tabular-nums`}
          >
            {resending ? "Sending" : waiting ? `Send again in ${cooldown.left}s` : "Send a new code"}
          </button>
        </div>
        <div className="mt-4 min-h-11">{resent && <FormNotice>New code sent. Use the most recent email.</FormNotice>}</div>
      </div>
    </>
  );
}

function DoneStep({ email }: { email: string }) {
  const signInRef = useRef<HTMLAnchorElement>(null);
  // The form that held focus is gone; put focus on the next action.
  useEffect(() => signInRef.current?.focus(), []);

  return (
    <>
      <AuthHeading
        title="Password updated"
        subtitle="Your new password is saved. Use it the next time you sign in."
      />
      <Link ref={signInRef} href={`/login?email=${encodeURIComponent(email)}`} className={primaryPillClass}>
        Sign in
      </Link>
    </>
  );
}

function ResetFlow() {
  const params = useSearchParams();
  const [step, setStep] = useState<"request" | "password" | "done">("request");
  const [email, setEmail] = useState((params.get("email") ?? "").trim());

  return (
    <>
      <Steps steps={STEPS} current={step === "request" ? 0 : step === "password" ? 1 : 2} />
      {step === "request" && (
        <RequestStep
          initialEmail={email}
          onSent={(sentTo) => {
            setEmail(sentTo);
            setStep("password");
          }}
        />
      )}
      {step === "password" && (
        <NewPasswordStep email={email} onChangeEmail={() => setStep("request")} onDone={() => setStep("done")} />
      )}
      {step === "done" && <DoneStep email={email} />}
    </>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <ResetFlow />
    </Suspense>
  );
}
