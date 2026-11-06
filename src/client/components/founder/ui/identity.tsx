import { cn, initials } from "@/shared/lib/utils";

const AVATAR_BG = ["#0a6ab0", "#1b9e8a", "#d9644a", "#b8893e", "#3c8f2d", "#4fa2db", "#0b568f"];

export function avatarColor(name: string | null | undefined) {
  const s = name ?? "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

export function Avatar({
  name,
  size = "md",
  className,
  tone,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  tone?: "white" | "dark";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-xs";
  const style =
    tone === "white"
      ? { background: "#ffffff", color: "#0d2c48" }
      : tone === "dark"
        ? { background: "#0d2c48", color: "#ffffff" }
        : { background: avatarColor(name), color: "#ffffff" };
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide", dim, className)}
      style={style}
    >
      {initials(name)}
    </span>
  );
}

const LOGO_DIM = {
  sm: "h-8 w-8 rounded-lg p-1",
  md: "h-10 w-10 rounded-xl p-1",
  lg: "h-14 w-14 rounded-2xl p-1.5",
  xl: "h-[72px] w-[72px] rounded-[20px] p-2",
} as const;

export function CompanyLogo({
  src,
  name,
  size = "md",
  className,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof LOGO_DIM;
  className?: string;
}) {
  if (!src) {
    const fallback = size === "xl" ? "lg" : size;
    return (
      <Avatar
        name={name}
        size={fallback}
        className={cn(size === "xl" && "h-[72px] w-[72px] text-xl", className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-white shadow-sm ring-1 ring-navy-100",
        LOGO_DIM[size],
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={name ? `${name} logo` : "Company logo"} className="h-full w-full object-contain" />
    </span>
  );
}
