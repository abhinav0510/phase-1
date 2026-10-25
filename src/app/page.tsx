import type { Metadata } from "next";
import { brandFontVars } from "@/lib/fonts";
import "./home.css";
import { AskSidana } from "@/components/home/ask-form";
import { Cta } from "@/components/home/cta";
import { DealDesk } from "@/components/home/deal-desk";
import { HomeFooter } from "@/components/home/footer";
import { HomeHero } from "@/components/home/hero";
import { HomeShell } from "@/components/home/home-shell";
import { HowWeHelp } from "@/components/home/how-we-help";
import { Mandates } from "@/components/home/mandates";

export const metadata: Metadata = {
  title: "Sidana Labs — Fundraising advisory and investor relations for startups",
  description:
    "Sidana Labs builds your investment memo, matches you to investors whose thesis fits, runs the outreach and the meetings, and reports to you every Saturday.",
};

// Public Sidana Labs marketing site. The platform lives behind /login
// (founders) and the unlisted /teamonly (Sidana team).
export default function HomePage() {
  return (
    <HomeShell className={brandFontVars}>
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
