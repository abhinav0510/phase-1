import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
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
        gold: "0 0 40px rgba(216,176,120,0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
