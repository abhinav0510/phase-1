import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brandFontVars } from "@/client/lib/fonts";
import { SITE } from "@/client/components/site/site-config";

export const metadata: Metadata = {
  title: "Privacy policy · SV Dealflow by Sidana Ventures",
  description: "How SV Dealflow, Sidana Ventures' founder and investor portal, collects, uses and protects personal data.",
};

const UPDATED = "27 November 2026";

/**
 * Privacy policy for svdealflow.io (the founder, investor and team portals).
 * Public page, also the policy link on the Google sign-in consent screen.
 * DRAFT for Sidana Ventures' review: legal text, change it here only.
 */
export default function Privacy() {
  const mail = SITE.contactEmail;
  return (
    <div className={`${brandFontVars} min-h-screen bg-[#f4f8fb] text-[#0d2c48]`}>
      <header className="border-b border-[#0d2c48]/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label="SV Dealflow by Sidana Ventures — home">
            <Image src="/images/svdealflow-logo.png" alt="SV Dealflow by Sidana Ventures" width={720} height={189} priority style={{ width: "auto", height: 40 }} />
          </Link>
          <Link href="/" className="text-sm font-semibold text-[#0d2c48]/70 hover:text-[#0a6ab0]">
            ← Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <article className="space-y-6 rounded-[20px] bg-white p-6 text-[15px] leading-relaxed text-[#0d2c48]/85 shadow-sm ring-1 ring-[#0d2c48]/10 sm:p-10 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#0d2c48] [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:font-semibold [&_a]:text-[#0a6ab0] [&_a]:underline">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0d2c48]/50">SV Dealflow</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0d2c48]">Privacy policy</h1>
            <p className="mt-2 text-sm text-[#0d2c48]/60">Last updated {UPDATED}</p>
          </div>

          <p>
            SV Dealflow (svdealflow.io) is the online portal of <b>Sidana Ventures LLP</b> (&quot;Sidana Ventures&quot;, &quot;we&quot;). Founders
            use it to share their company&apos;s details with us; investors use it to see startups we work with, book meetings and talk to
            founders; and our team uses it to run both. This policy explains what personal data the portal holds, why, who can see it and
            how you can ask us to change or delete it.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>
              <b>Founders:</b> your name and email, the Login ID we give you, and what you add to the portal: your company profile, revenue
              and other figures, uploaded files (financial templates, MIS reports, your logo), and your chat messages with investors.
            </li>
            <li>
              <b>Investors:</b> your name, email address and profile picture from your Google account when you sign in with Google, the
              investment preferences (thesis) you set, the startups you mark as interesting or pass on and the reasons you give, the
              meetings you book, and your chat messages with founders.
            </li>
            <li>
              <b>Everyone:</b> records of sign-ins and of actions in the portal (for example &quot;profile updated&quot; or &quot;meeting
              booked&quot;), and the technical data any website receives, such as your IP address and browser type, kept in server logs.
            </li>
          </ul>

          <h2>Information from Google</h2>
          <p>
            Investors sign in with Google. We ask Google only for your <b>name, email address and profile picture</b> (the
            &quot;openid&quot;, &quot;email&quot; and &quot;profile&quot; permissions). We use them only to sign you in, to check that the
            email belongs to an investor Sidana Ventures works with, and to show your name in the portal. We do not read your Gmail, contacts,
            calendar or any other Google data, we do not sell it, and we do not use it for advertising.
          </p>
          <p>
            Sidana Ventures&apos; use of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>

          <h2>How we use it</h2>
          <ul>
            <li>To run the portal: sign you in, show founders their own data and show investors startups that fit their thesis.</li>
            <li>To introduce founders and investors, book the meetings they ask for, and let them message each other.</li>
            <li>To keep our own records of startups and investors up to date, so our introductions use the same information you see.</li>
            <li>To keep the portal secure, fix problems and understand how it is used.</li>
          </ul>

          <h2>Who can see it</h2>
          <ul>
            <li>
              <b>Investors</b> with access to the portal see a startup&apos;s profile, figures, deck and logo as the founder provided them.
              They never see founders&apos; MIS files, financial statement links or contact emails.
            </li>
            <li>
              <b>Founders</b> see their own data, and the names of investors who have met them or chat with them. They never see an
              investor&apos;s reasons for passing or private alerts.
            </li>
            <li>
              <b>The Sidana Ventures team</b> sees everything in the portal, including chats, to run introductions and support you.
            </li>
            <li>
              <b>Service providers</b> who host and run the portal for us, under their own data-protection terms: Supabase (database,
              sign-in and file storage), Hostinger (the server), Google (sign-in, Calendar and Meet), n8n (automation) and Fireflies (meeting
              notes for calls we join). We do not sell personal data to anyone.
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            The portal uses only the cookies it needs to keep you signed in and to make sign-in secure. It does not use advertising or
            third-party tracking cookies.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep your data while you use the portal and while Sidana Ventures works with you or your company. When that ends, or when you
            ask us, we delete it or make it anonymous, except where the law requires us to keep records for longer. Backups are kept for a
            limited time and then deleted.
          </p>

          <h2>How we protect it</h2>
          <p>
            Data is sent over encrypted connections (HTTPS), stored with access limited to the people and systems that need it, and backed
            up. Each person signs in to their own account and sees only what their role allows.
          </p>

          <h2>Your choices and rights</h2>
          <p>
            You can see and update most of your data yourself in the portal. You can also ask us to give you a copy, correct it, or delete
            it, or withdraw your consent to us using it, by emailing <a href={`mailto:${mail}`}>{mail}</a>. Deleting your data may mean you
            can no longer use the portal. We will reply within 30 days. These rights are in addition to those you have under India&apos;s
            Digital Personal Data Protection Act, 2023 and other laws that apply to you.
          </p>

          <h2>Changes</h2>
          <p>
            If we change this policy, we will update the date at the top of this page and, for important changes, tell you in the portal or
            by email.
          </p>

          <h2>Contact</h2>
          <p>
            Sidana Ventures LLP · <a href={`mailto:${mail}`}>{mail}</a>
          </p>
        </article>
      </main>

      <footer className="pb-10 text-center text-xs text-[#0d2c48]/50">© 2026 Sidana Ventures LLP · {mail}</footer>
    </div>
  );
}
