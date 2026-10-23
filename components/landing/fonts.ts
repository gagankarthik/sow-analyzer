// The public site's faces. Loaded only by MarketingShell (every marketing
// page), so the app never downloads or preloads them.
import { Geist, Instrument_Sans, Instrument_Serif, Schibsted_Grotesk } from "next/font/google";

// Instrument Sans: a crisp, slightly condensed grotesk for confident headlines.
export const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Instrument Serif italic: the public site's accent voice, one phrase per
// headline, paired with Instrument Sans (the same family's proportions).
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

/** Classes that declare --font-instrument / --font-instrument-serif. */
export const marketingFontVars = `${instrument.variable} ${instrumentSerif.variable}`;

// Geist: the home page's text face. A clean, neutral grotesk with clear
// figures, for body copy and the product fragments.
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Schibsted Grotesk: the home page's headings. A newspaper grotesk with
// more character than the text face, so headlines read as set, not default.
export const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
