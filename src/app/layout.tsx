import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const serif = localFont({
  src: [
    { path: "../fonts/cormorant-garamond/300-normal.woff2", weight: "300", style: "normal" },
    { path: "../fonts/cormorant-garamond/400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/cormorant-garamond/500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/cormorant-garamond/600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/cormorant-garamond/300-italic.woff2", weight: "300", style: "italic" },
    { path: "../fonts/cormorant-garamond/400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/cormorant-garamond/500-italic.woff2", weight: "500", style: "italic" },
    { path: "../fonts/cormorant-garamond/600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
});

const sans = localFont({
  src: [
    { path: "../fonts/inter/300-normal.woff2", weight: "300", style: "normal" },
    { path: "../fonts/inter/400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/inter/500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/inter/600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sidana Ventures — Capital · Strategy · Venture",
  description:
    "Strategic capital, institutional thinking, and hands-on execution for ambitious companies.",
  icons: { icon: "/images/favicon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
