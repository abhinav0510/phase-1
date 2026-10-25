import { Instrument_Sans, Instrument_Serif, Montserrat, Space_Mono } from "next/font/google";

/* Brand fonts for the public site (homepage and sign-in pages).
   The dashboard keeps Inter and Cormorant from the root layout; these are only
   applied where a page puts `brandFontVars` on its wrapper. */
const display = Montserrat({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-2",
  display: "swap",
});
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono", display: "swap" });

export const brandFontVars = `${display.variable} ${body.variable} ${serif.variable} ${mono.variable}`;
