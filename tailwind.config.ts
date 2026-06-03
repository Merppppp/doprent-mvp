import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Tailwind color tokens kept in sync with the CSS custom properties
      // in app/globals.css (which are the source of truth — OKLCH, warm-tinted).
      // Tailwind doesn't accept oklch() in arbitrary contexts pre-v4, so we
      // reference the vars directly. Use `bg-ink`, `text-ink-2`, etc. as before.
      colors: {
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        warm: "var(--warm)",
        "on-dark": "var(--on-dark)",
        "line-green": "var(--line-green)",
        danger: "var(--danger)",
        success: "var(--success)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Sarabun",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: {
        shell: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
