import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// Inter for the interface and headings (variable: weights 400–700 incl.
// the 450 body weight). Plex Mono for references and figures (not preloaded).
// The public site's Instrument faces load with MarketingShell. The CSS
// variable keeps its old name so nothing else changes.
const plexSans = Inter({
  variable: "--font-plex",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const DEFAULT_TITLE = "Blue-IQ Govern | Contract review against your matrix";

// Site-wide defaults. Each public page sets its own title, description and
// canonical through `pageMetadata` (lib/seo.ts); the share image comes from
// app/opengraph-image.tsx.
export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      // The (app) layout's pre-paint script sets data-sidebar on <html>.
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* App providers live in the (app) and (auth) layouts, not here. */}
        {children}
      </body>
    </html>
  );
}
