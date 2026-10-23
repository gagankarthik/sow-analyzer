// The public site's faces. Loaded only by MarketingShell (every marketing
// page), so the app never downloads or preloads them.
import { Geist, Schibsted_Grotesk } from "next/font/google";

// Geist: the site's text face. A clean, neutral grotesk with clear
// figures, for body copy and the product fragments.
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Schibsted Grotesk: the site's headings. A newspaper grotesk with
// more character than the text face, so headlines read as set, not default.
export const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
