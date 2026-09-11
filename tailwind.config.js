/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        accent: "var(--color-accent)",
        accentSoft: "var(--color-accent-soft)"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        instrument: ["'Instrument Serif'", "serif"],
        dmSerif: ["'DM Serif Display'", "serif"]
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)"
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        pill: "var(--radius-pill)"
      },
      spacing: {
        section: "var(--space-section)",
        container: "var(--space-container)"
      },
      maxWidth: {
        copy: "var(--measure-copy)",
        shell: "var(--measure-shell)"
      },
      transitionTimingFunction: {
        reveal: "var(--ease-reveal)"
      }
    }
  },
  plugins: []
};
