// Chart palette for the founder dashboard. Validated (dataviz skill) as a
// categorical set on white: lightness band, chroma, CVD and normal-vision
// separation, 3:1 contrast all pass in this order. Keep the order fixed so a
// series never changes colour when a sibling disappears. Plain module (no
// "use client") so both server and client code can read the values.
export const SERIES = {
  navy: "#2F5FA8",
  gold: "#B8893E",
  teal: "#1B9E8A",
  coral: "#D9644A",
  violet: "#7C6BD9",
} as const;

export const INK = {
  muted: "#64748b",
  grid: "#e5e9f0",
  track: "#e8edf5",
};
