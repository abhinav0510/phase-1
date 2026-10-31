import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/client/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Platform (dashboard) navy palette
        navy: {
          50: "#f1f4f9",
          100: "#dde4ef",
          200: "#c2cfe2",
          300: "#98afd0",
          400: "#6887b8",
          500: "#476aa0",
          600: "#365385",
          700: "#2d436c",
          800: "#1f2f4d",
          900: "#141f35",
          950: "#0b1222",
        },
        brand: { DEFAULT: "#1f2f4d", accent: "#476aa0" },
        // Dashboard frame + pastel stat-card tints
        frame: "#e9edf4",
        // Founder portal: Sidana logo blue + green on white. Light ocean / leaf
        // tints for panels, deep-blue "tide" for text instead of black.
        canvas: "#f3f8fb",
        tide: { DEFAULT: "#0d2c48", 2: "#163f63", 3: "#1f527e" },
        ocean: {
          50: "#eef7fd",
          100: "#dbeefa",
          200: "#b9ddf4",
          300: "#88c3ea",
          400: "#4fa2db",
          500: "#1f84c9",
          600: "#0a6ab0",
          700: "#0b568f",
          800: "#0e4774",
          900: "#113b60",
        },
        leaf: {
          50: "#f1fbee",
          100: "#def5d7",
          200: "#bfe9b2",
          300: "#95d983",
          400: "#6dc958",
          500: "#4fb13b",
          600: "#3c8f2d",
          700: "#317126",
          800: "#2a5a23",
          900: "#254b20",
        },
        pastel: {
          blue: "#e4edfb",
          lavender: "#ebe5f8",
          mint: "#e0f3e9",
          cream: "#fdf0d8",
        },
        // Sidana Labs marketing site palette
        midnight: { DEFAULT: "#07111F", 2: "#0B1728", 3: "#101D30" },
        ivory: "#F5F0E7",
        muted: "#B5BECC",
        // Light-mode site palette
        paper: { DEFAULT: "#FBFBF9", 2: "#FFFFFF", 3: "#F2F4F7" },
        ink: { DEFAULT: "#0B1728", muted: "#5B6678" },
        gold: { DEFAULT: "#D8B078", light: "#E8CFA0", dim: "#A8865A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.06), 0 1px 3px 0 rgb(16 24 40 / 0.1)",
        soft: "0 1px 2px rgb(16 24 40 / 0.04), 0 10px 30px -16px rgb(16 24 40 / 0.12)",
        frame: "0 30px 80px -30px rgb(20 31 53 / 0.35)",
        gold: "0 0 40px rgba(216,176,120,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
