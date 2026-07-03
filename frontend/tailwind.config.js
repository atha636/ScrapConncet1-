/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#EDE4D3",
        surface: "#FAF5EA",
        surfaceRaised: "#FFFCF5",
        ink: "#241A12",
        inkSoft: "#6B5A47",
        inkFaint: "#9C8A73",
        rust: {
          DEFAULT: "#A63D24",
          dark: "#7E2E1A",
          light: "#C25836",
        },
        amber: {
          DEFAULT: "#C4841E",
          dark: "#9C6816",
          light: "#DDA246",
        },
        line: "#D8C9AE",
        danger: "#8C2F1B",
      },
      fontFamily: {
        display: ["'Roboto Slab'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        ticket: "6px",
      },
    },
  },
  plugins: [],
};