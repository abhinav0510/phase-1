import localFont from "next/font/local";

/* Brand fonts for the public site (homepage and sign-in pages).
   The dashboard keeps Inter and Cormorant from the root layout; these are only
   applied where a page puts `brandFontVars` on its wrapper.
   The files live in src/fonts so a build never depends on Google Fonts responding. */
const display = localFont({
  src: [
    { path: "../fonts/montserrat/700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/montserrat/800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
const body = localFont({
  src: [
    { path: "../fonts/instrument-sans/400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-sans/500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/instrument-sans/600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});
const serif = localFont({
  src: [
    { path: "../fonts/instrument-serif/400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif/400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-serif-2",
  display: "swap",
});
const mono = localFont({
  src: [
    { path: "../fonts/space-mono/400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/space-mono/700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const brandFontVars = `${display.variable} ${body.variable} ${serif.variable} ${mono.variable}`;
