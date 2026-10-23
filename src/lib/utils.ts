import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an INR amount given in CRORES (numeric cr) into a readable string. */
export function formatCr(cr: number | null | undefined): string {
  if (cr === null || cr === undefined || Number.isNaN(cr)) return "—";
  if (cr >= 100) return `₹${(cr / 100).toFixed(2)} Cr`.replace("Cr", "k Cr");
  return `₹${cr.toFixed(2)} Cr`;
}

/** Format an INR amount given in LAKHS. */
export function formatLakh(l: number | null | undefined): string {
  if (l === null || l === undefined || Number.isNaN(l)) return "—";
  if (l >= 100) return `₹${(l / 100).toFixed(2)} Cr`;
  return `₹${l.toFixed(2)} L`;
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
