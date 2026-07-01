import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: { DEFAULT: "var(--surface)", muted: "var(--surface-muted)" },
        border: "var(--border)",
        ring: "var(--ring)",
        foreground: "var(--text-primary)",
        "muted-foreground": "var(--text-secondary)",
      },
      borderRadius: {
        lg: "0.6rem",
        md: "0.45rem",
        sm: "0.3rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
