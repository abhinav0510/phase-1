// Chart palette for the founder dashboard: the iris brand accent leads, with
// teal / coral / gold / violet as distinguishable siblings on white. Keep the
// order fixed so a series never changes colour when a sibling disappears.
// Plain module (no "use client") so both server and client code can read it.
export const SERIES = {
  navy: "#5b5fe6",
  gold: "#B8893E",
  teal: "#1B9E8A",
  coral: "#D9644A",
  violet: "#8b7bea",
} as const;

export const INK = {
  muted: "#8292ab",
  grid: "#eef0f5",
  track: "#eceef5",
};
