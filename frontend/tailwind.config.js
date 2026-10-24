/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: "#0a0f1a",
        navy2: "#121a2b",
        slate: {
          950: "#0a0f1a",
          900: "#111726",
        },
        status: {
          ok: "#0f7a4e",
          warn: "#a66400",
          danger: "#b42318",
        },
      },
    },
  },
  plugins: [],
};
