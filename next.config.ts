import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Only enforced in production so the dev server's HMR
// websocket/eval isn't blocked. connect-src is scoped to the AWS services the
// app actually talks to: the API Gateway, S3 (presigned uploads), and Cognito.
const csp = [
  "default-src 'self'",
  // Next.js injects an inline bootstrap script; 'unsafe-inline' is required
  // until a nonce-based CSP is wired through the proxy.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.execute-api.us-east-2.amazonaws.com https://*.s3.amazonaws.com https://*.s3.us-east-2.amazonaws.com https://cognito-idp.us-east-2.amazonaws.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
];

const nextConfig: NextConfig = {
  // Don't leak the framework version.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
