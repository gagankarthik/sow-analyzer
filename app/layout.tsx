import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

// IBM Plex Sans for the interface and body: an institutional grotesk with
// clear figures, suited to research and legal offices. Plex Mono for
// references and figures. Source Serif 4, upright, is the public site's
// display face only (headlines), for a journal-like voice.
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

const sourceSerif = Source_Serif_4({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const DEFAULT_TITLE = "Blue-IQ | Contract review for SOWs, MSAs and amendments";

// Site-wide defaults. Each public page sets its own title, description and
// canonical through `pageMetadata` (lib/seo.ts); the share image comes from
// app/opengraph-image.tsx.
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
      className={`${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
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
