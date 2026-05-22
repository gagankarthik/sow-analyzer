import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Only enforced in production so the dev server's HMR
// websocket/eval isn't blocked. connect-src is scoped to the AWS services the
// app actually talks to: the API Gateway, S3 (presigned uploads), and Cognito.
const csp = [
  "default-src 'self'",
  // Next.js injects an inline bootstrap script; 'unsafe-inline' is required
  // until a nonce-based CSP is wired through the proxy. 'wasm-unsafe-eval' lets
  // the Spline 3D runtime instantiate its WebAssembly module.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Spline loads the scene + assets from prod.spline.design and fetches its
  // WebAssembly runtime from unpkg.com; web workers run from blob:.
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.execute-api.us-east-2.amazonaws.com https://*.s3.amazonaws.com https://*.s3.us-east-2.amazonaws.com https://cognito-idp.us-east-2.amazonaws.com https://prod.spline.design https://*.spline.design https://unpkg.com",
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
