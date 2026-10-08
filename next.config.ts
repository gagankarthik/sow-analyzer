import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

// The AWS endpoints the browser talks to, taken from the same env the app is
// built with so the policy follows the deployment instead of a hardcoded region.
const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL);
const apiRegion = apiOrigin?.match(/\.execute-api\.([a-z0-9-]+)\.amazonaws\.com$/)?.[1];
const cognitoRegion =
  process.env.NEXT_PUBLIC_COGNITO_REGION ||
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID?.split("_")[0] ||
  apiRegion ||
  "us-east-2";
const storageRegion = apiRegion || cognitoRegion;

// Uploads and document previews use presigned S3 URLs whose bucket host is only
// known to the backend. Set CSP_STORAGE_ORIGIN to that bucket's origin to pin
// it; otherwise any S3 bucket in the region is allowed.
const storageOrigins =
  originOf(process.env.CSP_STORAGE_ORIGIN) ??
  `https://*.s3.amazonaws.com https://*.s3.${storageRegion}.amazonaws.com`;

// Content-Security-Policy. Sent in production only: the dev server needs eval
// and a websocket for HMR, which this policy would block.
const csp = [
  "default-src 'self'",
  // Next.js emits inline bootstrap scripts. Allowing them by nonce instead would
  // force every page, including the static marketing pages, to render per
  // request, so 'unsafe-inline' stays until that trade-off is accepted.
  "script-src 'self' 'unsafe-inline'",
  // Inline style attributes come from React, the charts and the motion library.
  "style-src 'self' 'unsafe-inline'",
  // data: covers images embedded in a converted .docx preview.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  // API Gateway, Cognito sign-in, and S3 (presigned upload and download).
  `connect-src 'self' ${apiOrigin ?? `https://*.execute-api.${storageRegion}.amazonaws.com`} https://cognito-idp.${cognitoRegion}.amazonaws.com ${storageOrigins}`,
  // The document reader shows the original PDF from S3 in an iframe.
  `frame-src 'self' blob: ${storageOrigins}`,
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
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // HSTS and the CSP are production-only: HSTS would pin localhost to HTTPS for
  // anyone running the dev server over TLS, and the CSP would block HMR.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "Content-Security-Policy", value: csp },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Don't leak the framework version.
  poweredByHeader: false,
  // The leader home was retired; old links and bookmarks land on the dashboard.
  async redirects() {
    return [{ source: "/home", destination: "/dashboard", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // AI responses are per-user and must never be stored by a shared cache.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
