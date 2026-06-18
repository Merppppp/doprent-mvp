import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "24px",
        sm: "16px",
        lg: "24px",
      },
    },
    extend: {
      // Tailwind color tokens kept in sync with the CSS custom properties
      // in app/globals.css (which are the source of truth — OKLCH, warm-tinted).
      // Tailwind doesn't accept oklch() in arbitrary contexts pre-v4, so we
      // reference the vars directly. Use `bg-ink`, `text-ink-2`, etc. as before.
      colors: {
        // Neutrals
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        warm: "var(--warm)",
        "surface-2": "var(--surface-2)",
        "on-dark": "var(--on-dark)",
        // Brand accent (green)
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        "accent-dark": "var(--accent-dark)",
        primary: "var(--primary)",
        // Cobalt slot (green family — kept for compat)
        cobalt: "var(--cobalt)",
        "cobalt-2": "var(--cobalt-2)",
        "cobalt-soft": "var(--cobalt-soft)",
        // Saved-heart (warm red)
        save: "var(--save)",
        "save-2": "var(--save-2)",
        // Editorial warm accents
        blush: "var(--blush)",
        gold: "var(--gold)",
        // Hover tint alias
        "bg-hover": "var(--bg-hover)",
        // Semantic status
        "line-green": "var(--line-green)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
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
    },
  },
  plugins: [],
};

export default config;
