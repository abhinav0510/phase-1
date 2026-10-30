// Chart palette for the founder dashboard: the Sidana logo blue leads, with
// gold / teal / coral / logo green as distinguishable siblings on white. Keep the
// order fixed so a series never changes colour when a sibling disappears.
// Plain module (no "use client") so both server and client code can read it.
export const SERIES = {
  navy: "#0a6ab0",
  gold: "#B8893E",
  teal: "#1B9E8A",
  coral: "#D9644A",
  leaf: "#4fb13b",
} as const;

export const INK = {
  muted: "#8292ab",
  grid: "#eef0f5",
  track: "#eceef5",
};
