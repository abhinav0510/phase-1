import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Car,
  CircleCheck,
  Coins,
  Cpu,
  ExternalLink,
  Layers,
  Leaf,
  Rocket,
  ShoppingCart,
  Users,
} from "lucide-react";
import { brandFontVars } from "@/client/lib/fonts";
import { SITE } from "@/client/components/site/site-config";
import "./landing.css";

export const metadata: Metadata = {
  title: "Sidana Ventures — We do the Match. You Get the Fund.",
  description:
    "Sidana Ventures helps founders scale and raise funds from a network of family offices, angel groups and VCs. Founders follow their raise in the Sidana founder portal.",
};

// Headline figures. Keep these current: they are the first thing a visitor reads.
const HERO_STATS = [
  { Icon: Coins, value: "$130M USD", label: "Active fundraise" },
  { Icon: Users, value: "326", label: "Active investors" },
  { Icon: Building2, value: "126", label: "Active mandates" },
];

const TRACK = [
  { Icon: Rocket, value: "160+", label: "Startups supported" },
  { Icon: CalendarDays, value: "110+", label: "Deal flow meetings / month" },
  { Icon: Layers, value: "3–5", label: "Rounds closed / month" },
];

const SECTORS = [
  { Icon: Rocket, label: "SpaceTech & Aerospace" },
  { Icon: Car, label: "Automotive & EV" },
  { Icon: Cpu, label: "AI & Deep Tech" },
  { Icon: Leaf, label: "Renewable Energy & Climate" },
  { Icon: ShoppingCart, label: "Consumer Tech & D2C" },
  { Icon: Layers, label: "B2B SaaS & Enterprise" },
];

// The funds we share deals with. A logo shows when public/images/funds/<slug>.svg or .png
// exists; otherwise the name is shown in its place.
const FUNDS: { name: string; slug: string }[] = [
  { name: "Peak XV Partners", slug: "peak-xv" },
  { name: "Accel", slug: "accel" },
  { name: "Insight Partners", slug: "insight-partners" },
  { name: "Premji Invest", slug: "premji-invest" },
  { name: "WestBridge Capital", slug: "westbridge" },
  { name: "Bessemer Venture Partners", slug: "bessemer" },
  { name: "Elevation Capital", slug: "elevation" },
  { name: "Nexus Venture Partners", slug: "nexus" },
  { name: "Z47", slug: "z47" },
  { name: "A91 Partners", slug: "a91" },
  { name: "British International Investment", slug: "bii" },
  { name: "Jungle Ventures", slug: "jungle" },
  { name: "Flipkart Ventures", slug: "flipkart-ventures" },
  { name: "Blume Ventures", slug: "blume" },
  { name: "Info Edge Ventures", slug: "info-edge-ventures" },
];

function fundLogo(slug: string): string | null {
  for (const ext of ["svg", "png"]) {
    if (existsSync(path.join(process.cwd(), "public", "images", "funds", `${slug}.${ext}`))) return `/images/funds/${slug}.${ext}`;
  }
  return null;
}

const STEPS = [
  "We learn your sectors, stage preference and typical cheque size.",
  "We match our active book against your thesis and send only what fits.",
  "If your thesis shifts, one line to us and we re-match everything.",
  "For each deal: deck, founder intro, and a call if you want to look closer.",
];

const FOUNDER_POINTS = [
  "Family Office · DeepTech Venture Studio · Pre-IPO Investments",
  "Founded, invested in and advised numerous startups; former founder of MeriCAR (automotive repair platform)",
  "Published author of three books; featured in The Economic Times and Times of India",
  "Guest lecturer at IIM, IIT and NIT; active with NASSCOM, Startup India and TiE",
  "Recognised by IIM Ahmedabad; formative career at IndiaMart and Panalinks",
];

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  { q: "After signing an agreement, how long does Sidana Ventures work with startups?", a: "Our standard agreement is for 24 months (2 years), during which we actively support founders in securing multiple rounds of funding as per their business needs." },
  { q: "How does Sidana Ventures bring the right investors for startups?", a: "We have a strong network of global investors, family offices, venture capitalists and angel groups across diverse sectors. By understanding each founder's requirements, we connect them with investors who specialise in their industry, ensuring the right strategic fit and funding support." },
  { q: "After onboarding, how much time does Sidana Ventures take to connect startups with investors?", a: "Once a startup is onboarded, our team typically takes 4 to 6 weeks to prepare founders with pitch readiness, compliance and financial structuring before connecting them with suitable investors." },
  {
    q: "How many companies has Sidana Ventures successfully funded?",
    a: (
      <>
        Sidana Ventures has facilitated funding for numerous startups. See the portfolio on our{" "}
        <a href="https://sidanaventures.com/family/portfolio.php">Startups page</a>.
      </>
    ),
  },
  { q: "Why should startups choose Sidana Ventures?", a: "Sidana Ventures offers startups access to a global network of investors, angel groups and venture capitalists. We believe fundraising is not an endpoint but a step towards long-term success. Our team works closely with founders at every stage, providing guidance, mentorship and strategic support to build their growth path and achieve their business goals." },
];

const SIDANA = "https://sidanaventures.com/family";
const LINKEDIN = "https://www.linkedin.com/company/sidanaventures/";
const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/rakeshsidana/";

// Public landing page. The portal lives behind /login (founders) and the unlisted
// /teamonly (Sidana team). Nothing here links to the team sign-in.
export default function HomePage() {
  return (
    <div className={`landing ${brandFontVars}`}>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand brand-logo" aria-label="SV Dealflow by Sidana Ventures">
            <Image src="/images/svdealflow-logo.png" alt="SV Dealflow by Sidana Ventures" width={720} height={189} priority />
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Fundraising advisory · Investor relations · Family office</p>
              <h1>
                We do
                <br />
                the Match.
                <br />
                <span className="grad">You Get the Fund.</span>
              </h1>
            </div>
            <div className="hero-side">
              <ul className="hero-stats" aria-label="Sidana Ventures today">
                {HERO_STATS.map(({ Icon, value, label }) => (
                  <li key={label}>
                    <span className="ic" aria-hidden="true"><Icon /></span>
                    <b>{value}</b>
                    <small>{label}</small>
                  </li>
                ))}
              </ul>
              <p className="lead">
                We help founders scale and raise funds from our network of family offices, angel groups and VCs. We are
                boundary-less and sector-agnostic, and bring any kind of capital, grant, debt or equity, to support founders.
              </p>
              <div className="actions">
                <Link href={SITE.loginPath} className="btn btn-primary">
                  Founder login <ArrowRight aria-hidden="true" />
                </Link>
                <Link href={SITE.investorLoginPath} className="btn btn-ghost">
                  Investor login <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <p className="hero-note">Founders get their Login ID and password from the Sidana team. Investors sign in with Google.</p>
            </div>
          </div>
        </section>

        <section className="band about" id="about">
          <div className="wrap band-grid">
            <h2 className="underlined">About Sidana Ventures</h2>
            <p>
              Sidana Ventures is a family-backed investment and consulting firm with a global footprint. Our network spans LPs,
              HNIs and family offices worldwide, and we work closely with Indian AIFs, VCFs and global VC funds to connect
              high-potential startups with strategic capital.
            </p>
          </div>
        </section>


        <section className="track">
          <ul className="wrap track-grid" aria-label="Our track record">
            {TRACK.map(({ Icon, value, label }) => (
              <li key={label}>
                <span className="ic tile" aria-hidden="true"><Icon /></span>
                <span>
                  <b>{value}</b>
                  <small>{label}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section id="banking">
          <div className="wrap">
            <h2 className="underlined">Investment Banking</h2>
            <p className="intro">
              Through our investment banking arm we support 160+ startups raising from early stage to Series A, across sectors:
            </p>
            <ul className="sectors">
              {SECTORS.map(({ Icon, label }) => (
                <li key={label}>
                  <span className="ic" aria-hidden="true"><Icon /></span>
                  <b>{label}</b>
                </li>
              ))}
            </ul>
            <p className="after">
              The banking arm is sector agnostic. We work closely with founders through their first round, and invest
              ourselves in the second.
            </p>
          </div>
        </section>

        <section id="network">
          <div className="wrap">
            <h2 className="underlined">Investor Network</h2>
            <p className="intro">We share thesis-matched deals with leading funds across India and globally:</p>
            <div className="marquee" aria-label="Funds we share deals with">
              {/* The list twice, so the strip scrolls without a gap; the copy is hidden from screen readers. */}
              {[0, 1].map((copy) => (
                <ul className="marquee-track" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                  {FUNDS.map(({ name, slug }) => {
                    const logo = fundLogo(slug);
                    return (
                      <li key={slug} title={name}>
                        {logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logo} alt={copy === 1 ? "" : name} loading="lazy" />
                        ) : (
                          <span>{name}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ))}
            </div>
          </div>
        </section>

        <section id="how">
          <div className="wrap">
            <h2 className="underlined">How We Work With Investors</h2>
            <ol className="steps">
              {STEPS.map((text, i) => (
                <li key={text}>
                  <span className="num" aria-hidden="true">{i + 1}</span>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="founder">
          <div className="wrap founder-grid">
            <div className="founder-card">
              <Image className="founder-photo" src="/images/rakesh-sidana.jpg" alt="Rakesh Sidana" width={240} height={240} />
              <h2>Rakesh Sidana</h2>
              <p className="role">
                Founder ·{" "}
                <a href={FOUNDER_LINKEDIN} target="_blank" rel="noopener noreferrer">
                  LinkedIn <ExternalLink aria-hidden="true" />
                </a>
              </p>
            </div>
            <div className="founder-bio">
              <p>
                Three decades of experience spanning technology, business building and investing. Has experienced every
                major technology wave from the rise of the internet (1995) to the emergence of AI and deep tech,
                consistently helping build and scale innovative ventures.
              </p>
              <ul className="checks">
                {FOUNDER_POINTS.map((p) => (
                  <li key={p}>
                    <CircleCheck aria-hidden="true" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="faq" id="faq">
          <div className="wrap faq-grid">
            <div>
              <h2>Still have questions?</h2>
              <p className="lead">
                <a href={SITE.pitchDeckFormUrl} target="_blank" rel="noopener noreferrer">Fill in this form</a> to share your
                pitch deck with the team, or write to us at <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
              </p>
            </div>
            <div>
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap">
          <div className="row">
            <div>
              <Link href="/" className="brand brand-logo" aria-label="SV Dealflow by Sidana Ventures">
                <Image src="/images/svdealflow-logo.png" alt="SV Dealflow by Sidana Ventures" width={720} height={189} />
              </Link>
              <p>A family office of investment advisory and financial consulting. We help founders raise funds and advise them on scaling the business.</p>
            </div>
            <nav aria-label="Sidana Ventures">
              <a href={`${SIDANA}/aboutus.php`}>About us</a>
              <a href={`${SIDANA}/portfolio.php`}>Startups</a>
              <a href={`${SIDANA}/blogs.php`}>SV Sharks</a>
              <a href={`${SIDANA}/services.php`}>Services</a>
              <a href={LINKEDIN}>LinkedIn</a>
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </nav>
          </div>
          <div className="fine">
            <span>© 2026 Sidana Ventures LLP</span>
            <span>
              <Link href="/privacy">Privacy policy</Link> · <a href={`${SIDANA}/terms-condition.php`}>Terms &amp; conditions</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
