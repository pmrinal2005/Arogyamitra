import type { Config } from "tailwindcss";

const config: Config = {
  // We only apply Tailwind's preflight-free utilities to dashboard/auth areas.
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0f766e",
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        risk: {
          low: "#16a34a",
          moderate: "#d97706",
          elevated: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["Instrument Sans", "system-ui", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ping-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "ping-in": "ping-in 0.4s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  // Disable preflight so Tailwind's global reset does not fight the landing page CSS.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};

export default config;
