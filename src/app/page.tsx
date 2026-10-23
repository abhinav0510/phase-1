import { SiteNav } from "@/components/site/nav";
import { Hero } from "@/components/site/hero";
import { ServicesStrip } from "@/components/site/services-strip";
import { Principles } from "@/components/site/principles";
import {
  Approach,
  Contact,
  Footer,
  Insights,
  Portfolio,
  WhatWeDo,
} from "@/components/site/sections";

// Public Sidana Labs marketing site. The platform lives behind /login
// (founders) and the unlisted /teamonly (Sidana team).
export default function HomePage() {
  return (
    <main className="min-h-screen bg-paper font-sans text-ink">
      <SiteNav />
      <Hero />
      <ServicesStrip />
      <Principles />
      <WhatWeDo />
      <Approach />
      <Portfolio />
      <Insights />
      <Contact />
      <Footer />
    </main>
  );
}
