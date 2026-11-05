import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarCheck,
  Clock3,
  FileText,
  Landmark,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { brandFontVars } from "@/client/lib/fonts";
import { SITE } from "@/client/components/site/site-config";
import "./landing.css";

export const metadata: Metadata = {
  title: "Sidana Ventures — We do the Match. You Get the Fund.",
  description:
    "Sidana Ventures helps founders scale and raise funds from a network of family offices, angel groups and VCs. Founders follow their raise in the Sidana founder portal.",
};

// Copy comes from sidanaventures.com (/family and /vc) and its FAQ page.
const FEATURES = [
  { Icon: Clock3, title: "Real-time updates", text: "Every match, outreach and investor reply shows on your dashboard as Sidana's desk logs it. No waiting for a report." },
  { Icon: Sparkles, title: "Exact thesis matching", text: "Investors matched on sector, stage, cheque size, geography and their own mandate, so every introduction fits." },
  { Icon: Mail, title: "Email notifications", text: "Updates and announcements from the Sidana team reach your inbox, and stay in the portal to read any time." },
  { Icon: CalendarCheck, title: "Meeting invites", text: "Investor meetings Sidana sets up land on your calendar, with the join link and the investor's details in the portal." },
  { Icon: BarChart3, title: "Financial track for investors", text: "Upload your figures once. Revenue, MRR and expenses are charted and ready to show, in rupees." },
];

const SCREENS = [
  { src: "/images/portal/investors.jpg", alt: "The Investors & Matches page", title: "Exact thesis matching", text: "Every investor matched to you, with their cheque size, geography, sectors and stages, where they stand, and the reason when one passes." },
  { src: "/images/portal/financials.jpg", alt: "The Financials page with charts", title: "Financial track for investors", text: "Annual and monthly revenue, revenue against expenses and revenue by year, charted from the figures you upload." },
  { src: "/images/portal/meetings.jpg", alt: "The Meetings page", title: "Meeting invites", text: "Past and upcoming investor meetings Sidana has arranged, with the details and the join link for each one." },
];

const SERVICES = [
  { Icon: TrendingUp, title: "Equity funding", text: "We connect startups with family office angels, venture capital firms and global investors from the USA and Europe, backing unique and futuristic ideas that drive innovation." },
  { Icon: Landmark, title: "Debt funding", text: "Fast, flexible debt funding through alliances with NBFCs, lenders and syndicates, so founders access capital quickly for growth, working capital or bridge rounds without equity dilution." },
  { Icon: Briefcase, title: "Pre-IPO investments", text: "End-to-end Pre-IPO investment solutions, from compliance readiness to funding support, helping companies increase profitability and achieve stronger valuations before going public." },
  { Icon: FileText, title: "Preparation for funding", text: "Raising funds is one of the most critical milestones for any startup. We prepare founders to convince investors that their vision, team and business model can create lasting value." },
  { Icon: ShieldCheck, title: "Financial and compliance", text: "End-to-end financial and compliance support through our team of expert CAs and CSs, keeping startups investor-ready, compliant and strategically aligned for growth." },
  { Icon: Scale, title: "Legal support", text: "Dedicated legal support through expert lawyers on our panel, helping startups navigate challenges, compliance and contracts in today's competitive environment." },
];

const PROMISES = [
  ["If you are not getting the lead investor", "We are the lead."],
  ["If your business is going into a toss, for any reason", "We will pick up your call."],
  ["If your equity round is not closed from the last 6 months", "We will do the bridge round."],
  ["We are not just a bunch of investors", "We are supporters of every founder."],
];

const QUOTES = [
  { text: "It's long time working with the team. VC network really helped us to close bridge rounds in equity and debt.", name: "Yashwant", role: "Founder, HOORA" },
  { text: "Getting an investor from Switzerland is a great achievement for us using Sidana Ventures' global investors network.", name: "Tushar", role: "Founder, VAANI.ai" },
  { text: "Pre-IPO investments and consulting services are a great offering by the team.", name: "Ankit", role: "Paper Arizona" },
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

function LoginButton({ className }: { className?: string }) {
  return (
    <Link href={SITE.loginPath} className={`btn btn-primary ${className ?? ""}`}>
      Founder login <ArrowRight aria-hidden="true" />
    </Link>
  );
}

// Public landing page. The portal lives behind /login (founders) and the unlisted
// /teamonly (Sidana team). Nothing here links to the team sign-in.
export default function HomePage() {
  return (
    <div className={`landing ${brandFontVars}`}>
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand" aria-label="Sidana Ventures">
            <Image src="/images/logo-icon.png" alt="" width={36} height={36} />
            <span>
              <b>Sidana Ventures</b>
              <small>Founder portal</small>
            </span>
          </Link>
          <LoginButton />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap">
            <div className="hero-grid">
              <div>
                <p className="eyebrow">Fundraising advisory · Investor relations · Family office</p>
                <h1>
                  We do the Match.
                  <br />
                  <span className="grad">You Get the Fund.</span>
                </h1>
              </div>
              <div>
                <p className="lead">
                  We help founders scale and raise funds from our network of family offices, angel groups and VCs. We are
                  boundary-less and sector-agnostic, and bring any kind of capital, grant, debt or equity, to support founders.
                </p>
                <div className="actions">
                  <LoginButton />
                </div>
                <p className="hero-note">Founders get their Login ID and password from the Sidana team.</p>
              </div>
            </div>
            <div className="shot">
              <div className="frame">
                <div className="bar" aria-hidden="true">
                  <i /><i /><i />
                  <span>svdealflow.io/dashboard</span>
                </div>
                <Image
                  src="/images/portal/dashboard.jpg"
                  alt="The founder dashboard: current ask, allocation left, investor matches, meetings and the outreach pipeline."
                  width={2160}
                  height={1350}
                  priority
                />
              </div>
            </div>
            <div className="stats" aria-label="How Sidana works with founders">
              <div className="stat"><b>24 months</b><span>Our standard agreement, through multiple rounds of funding</span></div>
              <div className="stat"><b>4–6 weeks</b><span>From onboarding to your first investor connects</span></div>
              <div className="stat"><b>India · USA · Europe · Japan</b><span>Family offices, angel groups and VCs in our network</span></div>
            </div>
          </div>
        </section>

        <section className="key" id="features">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Key features</p>
              <h2>What you get with Sidana.</h2>
            </div>
            <div className="key-grid">
              {FEATURES.map(({ Icon, title, text }) => (
                <div className="key-card" key={title}>
                  <div className="ic"><Icon aria-hidden="true" /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="portal">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Inside the founder portal</p>
              <h2>Real screens from the portal every founder signs in to.</h2>
            </div>
            <div className="screens">
              {SCREENS.map((s) => (
                <figure className="screen" key={s.src}>
                  <div className="frame">
                    <Image src={s.src} alt={s.alt} width={2160} height={1350} />
                  </div>
                  <figcaption>
                    <b>{s.title}</b>
                    {s.text}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="services" id="services">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Our services</p>
              <h2>Raising every kind of capital, and supporting you to scale.</h2>
            </div>
            <div className="cards">
              {SERVICES.map(({ Icon, title, text }) => (
                <div className="card" key={title}>
                  <div className="ic"><Icon aria-hidden="true" /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="promise">
          <div className="wrap">
            <p className="eyebrow">Why founders choose Sidana</p>
            <h2>“We believe in founders, not just in ideas.”</h2>
            <div className="lines">
              {PROMISES.map(([when, then]) => (
                <div key={then}>
                  <small>{when}</small>
                  <b>{then}</b>
                </div>
              ))}
            </div>
            <p className="sign">
              Sidana Ventures is founded by the family of Rakesh Sidana. A family office of investment advisory and
              financial consulting, working closely with founders.
            </p>
          </div>
        </section>

        <section id="partners">
          <div className="wrap">
            <div className="section-head">
              <p className="eyebrow">Our partners</p>
              <h2>We do not make clients, we make partners.</h2>
            </div>
            <div className="quotes">
              {QUOTES.map((q) => (
                <blockquote className="quote" key={q.name}>
                  <p>“{q.text}”</p>
                  <footer>
                    <b>{q.name}</b>
                    {q.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="faq" id="faq">
          <div className="wrap faq-grid">
            <div>
              <p className="eyebrow">FAQ</p>
              <h2>Frequently asked questions</h2>
              <p className="lead">Still have questions? Write to the team at {SITE.contactEmail}.</p>
            </div>
            <div>
              {FAQS.map((f, i) => (
                <details key={f.q} open={i === 0}>
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
              <Link href="/" className="brand" aria-label="Sidana Ventures">
                <Image src="/images/logo-icon.png" alt="" width={36} height={36} />
                <span><b>Sidana Ventures</b></span>
              </Link>
              <p>A family office of investment advisory and financial consulting. We help founders raise funds and advise them on scaling the business.</p>
            </div>
            <nav aria-label="Sidana Ventures">
              <a href={`${SIDANA}/aboutus.php`}>About us</a>
              <a href={`${SIDANA}/portfolio.php`}>Startups</a>
              <a href={`${SIDANA}/blogs.php`}>SV Sharks</a>
              <a href={`${SIDANA}/services.php`}>Services</a>
              <a href="https://www.linkedin.com/company/sidanaventures/">LinkedIn</a>
              <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
            </nav>
          </div>
          <div className="fine">
            <span>© 2026 Sidana Ventures LLP</span>
            <span>
              <a href={`${SIDANA}/privacy-policiy.php`}>Privacy policy</a> · <a href={`${SIDANA}/terms-condition.php`}>Terms &amp; conditions</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
