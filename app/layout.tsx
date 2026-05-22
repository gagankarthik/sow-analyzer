import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Analytics } from "@vercel/analytics/next"
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif-pro",
  subsets: ["latin"],
  display: "swap",
});

// Geist — clean geometric sans used across the landing page (display + body).
const geistSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blue-iq.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Blue-IQ — AI contract & SOW review software",
    template: "%s · Blue-IQ",
  },
  description:
    "Blue-IQ reads your SOWs, MSAs, and amendments, pulls out every clause, scores the risk against your playbook, and tracks how contract value changes over time — so review takes minutes instead of weeks.",
  applicationName: "Blue-IQ",
  keywords: [
    "contract intelligence",
    "SOW analysis",
    "statement of work software",
    "clause extraction",
    "contract review software",
    "AI contract analysis",
    "contract risk scoring",
    "amendment tracking",
    "contract lifecycle management",
    "legal operations",
  ],
  authors: [{ name: "Blue-IQ" }],
  creator: "Blue-IQ",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Blue-IQ",
    title: "Blue-IQ — AI contract & SOW review software",
    description:
      "Extract every clause, score the risk against your playbook, and watch contract value change across amendments. Review SOWs and MSAs in minutes.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blue-IQ — AI contract & SOW review software",
    description:
      "Extract every clause, score the risk, and track contract value across amendments. SOW and MSA review in minutes.",
  },
  robots: { index: true, follow: true },
};

// Inline theme bootstrap — runs before paint to avoid a flash of light theme
// when the user has dark mode persisted in localStorage or prefers it via OS.
const THEME_BOOTSTRAP = `
try {
  var t = localStorage.getItem('clausal-theme');
  if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* `beforeInteractive` injects this in <head> before hydration so the
            theme class is set before any styled element paints. */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </AuthProvider>
        </QueryProvider>
        <Toaster richColors closeButton position="bottom-right" />
      </body>
    </html>
  );
}
