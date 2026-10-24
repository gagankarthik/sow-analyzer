import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Lexend } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// IBM Plex Sans for the interface and body: an institutional grotesk with
// clear figures, suited to research and legal offices. Plex Mono for
// references and figures (not preloaded: it is never above-the-fold text).
// The public site's Instrument faces load with MarketingShell
// (components/landing/fonts.ts), not here.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Lexend for page and section headings in the app: wide, open letterforms
// that read at a glance (applied to headings inside #main-content).
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["500", "600"],
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
      className={`${plexSans.variable} ${plexMono.variable} ${lexend.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* App providers live in the (app) and (auth) layouts, not here. */}
        {children}
      </body>
    </html>
  );
}
