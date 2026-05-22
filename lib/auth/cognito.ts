// Thin promise-based wrapper around amazon-cognito-identity-js. All auth runs
// client-side (SRP, no client secret). On every successful auth we mirror the
// ID token into a cookie (see session.ts) so the server-side proxy gate can do
// an optimistic redirect check.

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type CognitoUserSession,
  type ISignUpResult,
} from "amazon-cognito-identity-js";
import { setSessionCookie, clearSessionCookie } from "./session";

const REGION = process.env.NEXT_PUBLIC_COGNITO_REGION;
const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

/** Whether the public Cognito env config is present. */
export const cognitoConfigured = Boolean(USER_POOL_ID && CLIENT_ID);

export interface AuthUser {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  /** Tenant from the `custom:tenantId` claim; falls back to "default". */
  tenantId: string;
  groups: string[];
  /** ID-token expiry, seconds since epoch. */
  exp: number;
}

/** Normalized auth error carrying a stable `code` for UI branching. */
export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

let _pool: CognitoUserPool | null = null;
function pool(): CognitoUserPool {
  if (!cognitoConfigured) {
    throw new AuthError(
      "NotConfigured",
      "Authentication is not configured. Set NEXT_PUBLIC_COGNITO_* in .env.local.",
    );
  }
  if (!_pool) {
    _pool = new CognitoUserPool({
      UserPoolId: USER_POOL_ID as string,
      ClientId: CLIENT_ID as string,
    });
  }
  return _pool;
}

// ── Sign up ──────────────────────────────────────────────────────────────────

export async function signUp(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ userConfirmed: boolean; destination?: string }> {
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: params.email }),
  ];
  if (params.name) {
    attributes.push(new CognitoUserAttribute({ Name: "name", Value: params.name }));
  }
  return new Promise((resolve, reject) => {
    pool().signUp(
      params.email,
      params.password,
      attributes,
      [],
      (err, result?: ISignUpResult) => {
        if (err) return reject(normalizeError(err));
        resolve({
          userConfirmed: result?.userConfirmed ?? false,
          destination: result?.codeDeliveryDetails?.Destination,
        });
      },
    );
  });
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code.trim(), true, (err) => {
      if (err) return reject(normalizeError(err));
      resolve();
    });
  });
}

export async function resendConfirmationCode(email: string): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    user.resendConfirmationCode((err) => {
      if (err) return reject(normalizeError(err));
      resolve();
    });
  });
}

// ── Sign in / out ──────────────────────────────────────────────────────────

// Backstop for a sign-in that never settles (e.g. a stuck network request).
// Cognito normally answers in well under a second; 20s is generous.
const SIGN_IN_TIMEOUT_MS = 20_000;

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user = new CognitoUser({ Username: email, Pool: pool() });
  const details = new AuthenticationDetails({ Username: email, Password: password });

  return new Promise<AuthUser>((resolve, reject) => {
    // amazon-cognito-identity-js leaves the promise PENDING — no success, no
    // failure — when it reaches a challenge we don't provide a callback for
    // (MFA/TOTP/custom, which Cognito can trigger via adaptive/risk-based auth
    // on an unrecognized device, IP, or origin). That manifests as a sign-in
    // button that spins forever with nothing logged. We settle exactly once and
    // turn every challenge we don't yet support into an actionable error.
    let settled = false;
    const timer: { id?: ReturnType<typeof setTimeout> } = {};
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      if (timer.id) clearTimeout(timer.id);
      action();
    };
    const ok = (u: AuthUser) => finish(() => resolve(u));
    const fail = (e: AuthError) => finish(() => reject(e));

    timer.id = setTimeout(
      () =>
        fail(
          new AuthError(
            "Timeout",
            "Sign-in timed out. Check your connection and try again.",
          ),
        ),
      SIGN_IN_TIMEOUT_MS,
    );

    const challenge = (code: string, message: string) => () =>
      fail(new AuthError(code, message));

    const mfaMessage =
      "This account has multi-factor authentication enabled, which this app doesn't collect yet. Disable MFA for the user in the Cognito console (or turn off advanced/risk-based auth), then sign in again.";

    user.authenticateUser(details, {
      onSuccess: (session) => {
        persist(session);
        ok(claimsFromSession(session));
      },
      onFailure: (err) => fail(normalizeError(err)),
      newPasswordRequired: challenge(
        "NewPasswordRequired",
        "A new password is required for this account. Contact your administrator.",
      ),
      mfaRequired: challenge("MfaRequired", mfaMessage),
      totpRequired: challenge("MfaRequired", mfaMessage),
      selectMFAType: challenge("MfaRequired", mfaMessage),
      mfaSetup: challenge(
        "MfaSetup",
        "This account must finish setting up multi-factor authentication before it can sign in. Contact your administrator.",
      ),
      customChallenge: challenge(
        "CustomChallenge",
        "This sign-in needs an extra verification step that isn't supported here. Contact your administrator.",
      ),
    });
  });
}

/** Begin the forgot-password flow; Cognito emails a reset code. */
export async function forgotPassword(email: string): Promise<{ destination?: string }> {
  const user = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    user.forgotPassword({
      onSuccess: () => resolve({}),
      inputVerificationCode: (data: { CodeDeliveryDetails?: { Destination?: string } }) =>
        resolve({ destination: data?.CodeDeliveryDetails?.Destination }),
      onFailure: (err) => reject(normalizeError(err)),
    });
  });
}

/** Complete the forgot-password flow with the emailed code + a new password. */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const user = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    user.confirmPassword(code.trim(), newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(normalizeError(err)),
    });
  });
}

export function signOut(): void {
  try {
    pool().getCurrentUser()?.signOut();
  } catch {
    /* pool may be unconfigured; ignore */
  }
  clearSessionCookie();
}

// ── Session / token access ───────────────────────────────────────────────────

export function getCurrentUser(): CognitoUser | null {
  if (!cognitoConfigured) return null;
  return pool().getCurrentUser();
}

/** Resolve the active session, transparently refreshing via the refresh token. */
export async function getSession(): Promise<CognitoUserSession | null> {
  const user = getCurrentUser();
  if (!user) return null;
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) return resolve(null);
      persist(session);
      resolve(session);
    });
  });
}

/** The current valid ID token (auto-refreshed), or null if unauthenticated. */
export async function getIdToken(): Promise<string | null> {
  const session = await getSession();
  return session ? session.getIdToken().getJwtToken() : null;
}

/** The current user's decoded claims, or null if unauthenticated. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return session ? claimsFromSession(session) : null;
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new AuthError("NotAuthenticated", "You are not signed in.");
  // getSession must run first to hydrate the user's token cache.
  await getSession();
  return new Promise((resolve, reject) => {
    user.changePassword(oldPassword, newPassword, (err) => {
      if (err) return reject(normalizeError(err));
      resolve();
    });
  });
}

// ── internals ────────────────────────────────────────────────────────────────

function persist(session: CognitoUserSession): void {
  const idToken = session.getIdToken();
  setSessionCookie(idToken.getJwtToken(), idToken.getExpiration());
}

function claimsFromSession(session: CognitoUserSession): AuthUser {
  const p = session.getIdToken().decodePayload() as Record<string, unknown>;
  const groups = Array.isArray(p["cognito:groups"])
    ? (p["cognito:groups"] as string[])
    : [];
  return {
    sub: String(p.sub ?? ""),
    email: String(p.email ?? ""),
    name: typeof p.name === "string" ? p.name : undefined,
    emailVerified: p.email_verified === true,
    tenantId:
      typeof p["custom:tenantId"] === "string"
        ? (p["custom:tenantId"] as string)
        : "default",
    groups,
    exp: typeof p.exp === "number" ? p.exp : 0,
  };
}

interface CognitoLikeError {
  code?: string;
  name?: string;
  message?: string;
}

function normalizeError(err: unknown): AuthError {
  const e = err as CognitoLikeError;
  const code = e.code || e.name || "UnknownError";
  const map: Record<string, string> = {
    UserNotConfirmedException:
      "Your account isn't confirmed yet. Check your email for the verification code.",
    NotAuthorizedException: "Incorrect email or password.",
    UserNotFoundException: "Incorrect email or password.",
    UsernameExistsException: "An account with this email already exists.",
    CodeMismatchException: "That verification code is incorrect.",
    ExpiredCodeException: "That code has expired. Request a new one.",
    InvalidPasswordException:
      "Password doesn't meet the requirements (min 8 chars, upper/lowercase, number, symbol).",
    InvalidParameterException: "Please check the details you entered.",
    LimitExceededException: "Too many attempts. Please wait a moment and try again.",
    TooManyRequestsException: "Too many requests. Please slow down and retry.",
    PasswordResetRequiredException:
      "A password reset is required. Contact your administrator.",
  };
  return new AuthError(code, map[code] || e.message || "Something went wrong. Please try again.");
}

// Expose the configured region for callers that need to build issuer URLs, etc.
export const cognitoRegion = REGION;
