import Image from "next/image";
import Link from "next/link";
import type { NavItem } from "@/client/components/layout/nav";
import { PageTitle } from "./page-title";
import { TopSearch } from "./top-search";
import { UserMenu } from "./user-menu";

export function AdminTopBar({
  nav,
  tag,
  title,
  userName,
  userEmail,
  actions,
  searchHref,
  settingsHref,
}: {
  nav: NavItem[];
  tag: string;
  title: string;
  userName: string | null;
  userEmail: string | null;
  /** Extra controls shown before the user block (e.g. the announcements bell). */
  actions?: React.ReactNode;
  searchHref?: string;
  settingsHref?: string;
}) {
  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 pr-4 md:pr-8">
      <Link
        href="/admin"
        aria-label={`Sidana Ventures · ${tag}`}
        title={`Sidana Ventures · ${tag}`}
        className="flex w-16 shrink-0 items-center justify-center md:w-[100px]"
      >
        <Image src="/images/logo-icon.png" alt="" width={38} height={38} priority />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold tracking-tight text-navy-950">
          <PageTitle nav={nav} fallback={title} />
        </h1>
        <p className="truncate text-xs text-navy-500">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {searchHref ? <TopSearch action={searchHref} /> : null}
        {actions}
        <UserMenu userName={userName} userEmail={userEmail} settingsHref={settingsHref} />
      </div>
    </header>
  );
}
