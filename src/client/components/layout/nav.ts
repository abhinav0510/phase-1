// Nav items use a string icon KEY (not a component) so the list can be passed
// from server layouts into the client <Sidebar> without crossing a function
// over the server/client boundary. The key is resolved to a Lucide icon inside
// the client component (see sidebar.tsx).

export type NavIcon =
  | "shares"
  | "dashboard"
  | "startup"
  | "financials"
  | "round"
  | "investors"
  | "funding"
  | "meetings"
  | "documents"
  | "users"
  | "reports"
  | "settings"
  | "profile"
  | "matches"
  | "weekly"
  | "mail"
  | "announce"
  | "chat"
  | "activity";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
}

export const FOUNDER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Financials", href: "/financials", icon: "financials" },
  { label: "Pitch Deck", href: "/pitch-deck", icon: "documents" },
  { label: "Meetings", href: "/meetings", icon: "meetings" },
  { label: "Chats", href: "/chats", icon: "chat" },
  { label: "Overview", href: "/overview", icon: "round" },
  { label: "My Profile", href: "/profile", icon: "profile" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Startups", href: "/admin/startups", icon: "startup" },
  { label: "Investors", href: "/admin/investors", icon: "investors" },
  { label: "Matches", href: "/admin/matches", icon: "matches" },
  { label: "Profile Reviews", href: "/admin/profiles", icon: "users" },
  { label: "Meetings", href: "/admin/meetings", icon: "meetings" },
  { label: "Deal Sharing", href: "/admin/deal-sharing", icon: "shares" },
  { label: "Investor Chats", href: "/admin/chats", icon: "chat" },
  { label: "Portal Activity", href: "/admin/activity", icon: "activity" },
  { label: "Investor Access", href: "/admin/portal-access", icon: "investors" },
  { label: "Documents", href: "/admin/documents", icon: "documents" },
  { label: "Users & Access", href: "/admin/users", icon: "users" },
  { label: "Email Startups", href: "/admin/notifications", icon: "mail" },
  { label: "Announcements", href: "/admin/announcements", icon: "announce" },
  { label: "Reports", href: "/admin/reports", icon: "reports" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

export const INVESTOR_NAV: NavItem[] = [
  { label: "Matches", href: "/investor/matches", icon: "matches" },
  { label: "Shared Deals", href: "/investor/shared", icon: "mail" },
  { label: "Chats", href: "/investor/chats", icon: "chat" },
  { label: "My Meetings", href: "/investor/meetings", icon: "meetings" },
  { label: "Past Deals", href: "/investor/past-deals", icon: "reports" },
];
