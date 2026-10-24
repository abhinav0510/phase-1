import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, Montserrat, Space_Mono } from "next/font/google";
import "./home.css";
import { AskSidana } from "@/components/home/ask-form";
import { Cta } from "@/components/home/cta";
import { DealDesk } from "@/components/home/deal-desk";
import { HomeFooter } from "@/components/home/footer";
import { HomeHero } from "@/components/home/hero";
import { HomeShell } from "@/components/home/home-shell";
import { HowWeHelp } from "@/components/home/how-we-help";
import { Mandates } from "@/components/home/mandates";

/* Homepage fonts. Imported here, not in the root layout, so only this route
   preloads them; the dashboard and auth pages keep Inter and Cormorant. */
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

export const metadata: Metadata = {
  title: "Sidana Labs — Fundraising advisory and investor relations for startups",
  description:
    "Sidana Labs builds your investment memo, matches you to investors whose thesis fits, runs the outreach and the meetings, and reports to you every Saturday.",
};

// Public Sidana Labs marketing site. The platform lives behind /login
// (founders) and the unlisted /teamonly (Sidana team).
export default function HomePage() {
  return (
    <HomeShell className={`${display.variable} ${body.variable} ${serif.variable} ${mono.variable}`}>
      <HomeHero />
      <AskSidana />
      <Mandates />
      <HowWeHelp />
      <DealDesk />
      <Cta />
      <HomeFooter />
    </HomeShell>
  );
}
