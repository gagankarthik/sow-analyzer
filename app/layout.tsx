import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// IBM Plex Sans for the interface and body: an institutional grotesk with
// clear figures, suited to research and legal offices. Plex Mono for
// references and figures. Instrument Sans is the public site's face: a
// crisp, slightly condensed grotesk for confident headlines.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Instrument Serif italic: the public site's accent voice, one phrase per
// headline, paired with Instrument Sans (the same family's proportions).
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const DEFAULT_TITLE = "Blue-IQ Govern | Contract review against your matrix";

// Site-wide defaults. Each public page sets its own title, description and
// canonical through `pageMetadata` (lib/seo.ts); the share image comes from
// app/opengraph-image.tsx.
export const viewport: Viewport = {
  themeColor: "#F8F7F4",
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
      className={`${plexSans.variable} ${plexMono.variable} ${instrument.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* App providers live in the (app) and (auth) layouts, not here. */}
        {children}
      </body>
    </html>
  );
}
