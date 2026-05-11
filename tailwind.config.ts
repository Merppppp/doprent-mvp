import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A0A0A",
        "ink-2": "#4A4A4A",
        "ink-3": "#8A8A8A",
        line: "#E5E5E5",
        "line-2": "#F0F0F0",
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        warm: "#F5F4F0",
        "line-green": "#06C755",
        danger: "#DC2626",
        success: "#059669",
        info: "#2563EB",
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
