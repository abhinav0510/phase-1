import type { Metadata } from "next";
import { brandFontVars } from "@/client/lib/fonts";
import "./home.css";
import { AskSidana } from "@/client/components/home/ask-form";
import { Cta } from "@/client/components/home/cta";
import { DealDesk } from "@/client/components/home/deal-desk";
import { HomeFooter } from "@/client/components/home/footer";
import { HomeHero } from "@/client/components/home/hero";
import { HomeShell } from "@/client/components/home/home-shell";
import { HowWeHelp } from "@/client/components/home/how-we-help";
import { Mandates } from "@/client/components/home/mandates";

export const metadata: Metadata = {
  title: "Sidana Ventures — Fundraising advisory and investor relations for startups",
  description:
    "Sidana Ventures builds your investment memo, matches you to investors whose thesis fits, runs the outreach and the meetings, and reports to you every Saturday.",
};

// Public Sidana Ventures marketing site. The platform lives behind /login
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
