/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Every one of these is a CSS variable defined in index.css, once
        // for :root (light) and once for .dark — so every existing
        // bg-surface / text-ink / border-line usage across the app
        // automatically repaints for dark mode with zero per-component
        // changes. The rgb(... / <alpha-value>) form is what lets Tailwind
        // opacity modifiers (bg-rust/[0.08], border-line/40, etc.) keep
        // working exactly as before.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        surfaceRaised: "rgb(var(--c-surface-raised) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        inkSoft: "rgb(var(--c-ink-soft) / <alpha-value>)",
        inkFaint: "rgb(var(--c-ink-faint) / <alpha-value>)",
        rust: {
          DEFAULT: "rgb(var(--c-rust) / <alpha-value>)",
          dark: "rgb(var(--c-rust-dark) / <alpha-value>)",
          light: "rgb(var(--c-rust-light) / <alpha-value>)",
        },
        amber: {
          DEFAULT: "rgb(var(--c-amber) / <alpha-value>)",
          dark: "rgb(var(--c-amber-dark) / <alpha-value>)",
          light: "rgb(var(--c-amber-light) / <alpha-value>)",
        },
        line: "rgb(var(--c-line) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
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