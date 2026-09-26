/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#060218",
          deep: "#040110",
          elevated: "#0E0728",
        },
        substrate: {
          DEFAULT: "#130E2E",
          light: "#1C1440",
          elevated: "#251B54",
        },
        violet: {
          400: "#C084FC",
          500: "#A068FF",
          600: "#8B5CF6",
          700: "#7C3AED",
          glow: "rgba(160, 104, 255, 0.35)",
        },
        teal: {
          300: "#7BF1D8",
          400: "#48E5C2",
          500: "#22D3AC",
          600: "#00B88E",
          glow: "rgba(72, 229, 194, 0.35)",
        },
        emerald: {
          400: "#34D399",
          500: "#10B981",
        },
        amber: {
          400: "#FBBF24",
          500: "#F59E0B",
        },
        coral: {
          400: "#F87171",
          500: "#EF4444",
        },
        surface: {
          base: "#060218",
          card: "rgba(15, 8, 38, 0.7)",
          cardHover: "rgba(25, 14, 58, 0.8)",
          well: "rgba(9, 4, 24, 0.6)",
          border: "rgba(255, 255, 255, 0.08)",
          borderStrong: "rgba(255, 255, 255, 0.16)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        inter: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        instrument: ["'Instrument Serif'", "Georgia", "serif"],
        serif: ["'Instrument Serif'", "Georgia", "serif"],
        display: ["Urbanist", "Inter", "sans-serif"],
        urbanist: ["Urbanist", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "sovereign": "0 1px 2px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.35)",
        "sovereign-elevated": "0 2px 4px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.55)",
        "sovereign-well": "inset 0 2px 4px rgba(0, 0, 0, 0.7)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glass-elevated": "0 12px 32px rgba(0, 0, 0, 0.55)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      borderRadius: {
        "sm": "4px",
        "DEFAULT": "6px",
        "md": "8px",
        "lg": "10px",
        "xl": "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
}
