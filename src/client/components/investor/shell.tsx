import Image from "next/image";
import Link from "next/link";
import type { NavItem } from "@/client/components/layout/nav";
import { UserMenu } from "@/client/components/admin/user-menu";
import { FounderNav, FounderMobileNav } from "@/client/components/founder/nav";
import { PageFade } from "@/client/components/founder/motion";

/**
 * Investor portal frame. Same header, pill nav and page width as the Founder
 * Portal so both portals feel like one product; only the label, nav and menu differ.
 */
export function InvestorShell({
  nav,
  investorName,
  contactName,
  unreadChats,
  children,
}: {
  nav: NavItem[];
  investorName: string;
  contactName: string | null;
  unreadChats: number;
  children: React.ReactNode;
}) {
  const items = nav.map((i) => (i.href === "/investor/chats" && unreadChats > 0 ? { ...i, label: `${i.label} (${unreadChats})` } : i));
  return (
    <div className="min-h-screen bg-canvas text-tide">
      <header className="sticky top-0 z-40 border-b border-navy-100/60 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1560px] items-center gap-4 px-4 md:px-6">
          <Link href="/investor/matches" className="flex shrink-0 items-center gap-2.5">
            <Image src="/images/svdealflow-logo.png" alt="SV Dealflow by Sidana Ventures" width={720} height={189} priority className="h-9 w-auto" />
            <span className="hidden border-l border-navy-100 pl-2.5 text-[10px] font-semibold uppercase tracking-wide text-navy-500 xl:block">Investor Portal</span>
          </Link>

          <div className="flex min-w-0 flex-1 justify-center">
            <FounderNav items={items} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <UserMenu userName={investorName} userEmail={contactName} links={[]} signOutTo="/investor/login" />
          </div>
        </div>
        <FounderMobileNav items={items} />
      </header>

      <main className="mx-auto max-w-[1560px] px-4 pb-16 pt-5 md:px-6">
        <PageFade>{children}</PageFade>
      </main>
    </div>
  );
}
