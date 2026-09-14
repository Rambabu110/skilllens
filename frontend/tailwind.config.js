/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#070D1E",
          deep: "#050914",
          elevated: "#0B132B",
        },
        substrate: {
          DEFAULT: "#131E3A",
          light: "#1C2541",
          elevated: "#223154",
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
          base: "#050914",
          card: "#0f172a",
          cardHover: "#131e35",
          well: "#070d18",
          border: "rgba(255, 255, 255, 0.08)",
          borderStrong: "rgba(255, 255, 255, 0.16)",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Outfit", "Plus Jakarta Sans", "sans-serif"],
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
