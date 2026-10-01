"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth/cognito";
import {
  AuthHeading,
  EMAIL_PATTERN,
  FormAlert,
  PasswordField,
  PasswordRules,
  SubmitButton,
  TextField,
  authErrorCode,
  authLinkClass,
  commonAuthMessage,
  focusField,
  passwordIsStrong,
} from "@/components/auth/fields";

type FieldName = "name" | "email" | "password";
type Errors = Partial<Record<FieldName, React.ReactNode>>;

const ORDER: FieldName[] = ["name", "email", "password"];

function validate(values: Record<FieldName, string>): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter your full name.";
  if (!values.email.trim()) errors.email = "Enter your work email address.";
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter an email address like name@company.com.";
  if (!values.password) errors.password = "Create a password.";
  else if (!passwordIsStrong(values.password)) errors.password = "The password does not meet every requirement below.";
  return errors;
}

export default function SignupPage() {
  const router = useRouter();

  const [values, setValues] = useState<Record<FieldName, string>>({ name: "", email: "", password: "" });
  const [checked, setChecked] = useState<Partial<Record<FieldName, boolean>>>({});
  // Errors the server reported for a field; cleared when that field is edited.
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const problems = validate(values);
  const errorFor = (field: FieldName) => serverErrors[field] ?? (checked[field] ? problems[field] : undefined);

  function bind(field: FieldName) {
    return {
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValues((v) => ({ ...v, [field]: e.target.value }));
        setServerErrors((s) => ({ ...s, [field]: undefined }));
      },
      // Leaving an untouched, empty field is not an error yet.
      onBlur: () => setChecked((c) => ({ ...c, [field]: c[field] || values[field] !== "" })),
      error: errorFor(field),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setChecked({ name: true, email: true, password: true });
    const firstInvalid = ORDER.find((f) => problems[f]);
    if (firstInvalid) return focusField(firstInvalid);

    const email = values.email.trim().toLowerCase();
    setLoading(true);
    try {
      const res = await signUp({ email, password: values.password, name: values.name.trim() });
      const query = `email=${encodeURIComponent(email)}`;
      // `sent=1` tells the confirm screen a code is already on its way.
      router.push(res.userConfirmed ? `/login?${query}&notice=created` : `/confirm?${query}&sent=1`);
    } catch (err) {
      const code = authErrorCode(err);
      if (code === "UsernameExistsException") {
        setServerErrors({
          email: (
            <>
              An account with this email already exists.{" "}
              <Link href={`/login?email=${encodeURIComponent(email)}`} className="font-semibold underline underline-offset-4">
                Sign in
              </Link>
            </>
          ),
        });
        focusField("email");
      } else if (code === "InvalidPasswordException") {
        setServerErrors({ password: "This password was not accepted. Try a longer or less common one." });
        focusField("password");
      } else {
        setFormError(
          commonAuthMessage(err, err instanceof Error ? err.message : "We could not create your account. Try again."),
        );
      }
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHeading
        title="Create your account"
        subtitle="Set up a login for Blue-IQ Govern. We will email a code to verify your address."
      />

      <form onSubmit={onSubmit} noValidate>
        <TextField
          id="name"
          label="Full name"
          type="text"
          name="name"
          autoComplete="name"
          required
          {...bind("name")}
        />

        <TextField
          id="email"
          label="Work email"
          type="email"
          name="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name@company.com"
          required
          {...bind("email")}
        />

        <PasswordField
          id="password"
          label="Password"
          name="password"
          autoComplete="new-password"
          describedBy="password-rules"
          required
          {...bind("password")}
        />
        <PasswordRules id="password-rules" value={values.password} flagUnmet={Boolean(checked.password)} />

        <SubmitButton loading={loading} loadingLabel="Creating account">
          Create account
        </SubmitButton>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          By creating an account you agree to the{" "}
          <Link href="/legal/terms" className={authLinkClass}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className={authLinkClass}>
            Privacy Policy
          </Link>
          .
        </p>
        <FormAlert message={formError} />
      </form>

      <p className="text-base text-[var(--ink-600)]">
        Already have an account?{" "}
        <Link href="/login" className={authLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}
