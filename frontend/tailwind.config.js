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
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glass-elevated": "0 20px 48px -8px rgba(0, 0, 0, 0.65), 0 0 20px 0 rgba(72, 229, 194, 0.08)",
        "teal-glow": "0 0 25px rgba(72, 229, 194, 0.25)",
        "amber-glow": "0 0 25px rgba(245, 158, 11, 0.2)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glass-gradient": "linear-gradient(135deg, rgba(28, 37, 65, 0.75) 0%, rgba(11, 19, 43, 0.85) 100%)",
        "teal-emerald-gradient": "linear-gradient(135deg, #48E5C2 0%, #10B981 100%)",
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
}
