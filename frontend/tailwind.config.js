/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gc: {
          bg: "var(--gc-bg)",
          sidebar: "var(--gc-sidebar)",
          card: "var(--gc-card)",
          surface: "var(--gc-surface)",
          primary: "var(--gc-primary)",
          electric: "var(--gc-electric)",
          success: "var(--gc-success)",
          warning: "var(--gc-warning)",
          critical: "var(--gc-critical)",
          text: "var(--gc-text)",
          "text-secondary": "var(--gc-text-secondary)",
          border: "var(--gc-border)",
        },
      },
      borderRadius: {
        gc: "var(--gc-radius)",
        "gc-lg": "var(--gc-radius-lg)",
        "gc-xl": "var(--gc-radius-xl)",
      },
      fontFamily: {
        sans: ["'Inter'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      screens: {
        xs: "390px",
        "3xl": "1920px",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "slide-right": "slideRight 0.25s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideRight: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
