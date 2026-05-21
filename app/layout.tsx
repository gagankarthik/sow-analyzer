import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Source_Serif_4, Space_Grotesk } from "next/font/google";
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

// Expressive variable display face for landing headlines (geometric, techy).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blue-IQ — Contract Intelligence",
  description:
    "The workspace where Bluey analyzes SOWs, contracts, and amendments to drive revenue, reduce risk, and accelerate deal cycles.",
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
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${spaceGrotesk.variable}`}
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
