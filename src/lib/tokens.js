export const tokens = {
  color: {
    bg: "#F5F1E8",
    bgElevated: "#FAF7F1",
    surface: "rgba(255,255,255,0.72)",
    surfaceStrong: "rgba(255,255,255,0.88)",
    text: "#243447",
    textStrong: "#1D2C3D",
    muted: "#66788A",
    line: "rgba(76,97,116,0.16)",
    lineStrong: "rgba(76,97,116,0.24)",
    accent: "#7F9FB1",
    accentStrong: "#5F8195",
    accentSoft: "#CDB58A"
  },
  type: {
    display: '"Cormorant Garamond", Georgia, serif',
    body: '"Inter", "Helvetica Neue", Arial, sans-serif',
    h1: "clamp(3.5rem, 8vw, 6.25rem)",
    h2: "clamp(2.5rem, 5.2vw, 4.25rem)",
    h3: "clamp(1.75rem, 3vw, 2.5rem)",
    bodyLg: "1.125rem",
    bodyMd: "1rem",
    bodySm: "0.9375rem",
    meta: "0.75rem"
  },
  spacing: {
    section: "clamp(6.5rem, 10vw, 10.5rem)",
    heroTop: "clamp(7.5rem, 12vw, 11rem)",
    container: "clamp(1.25rem, 4vw, 2.75rem)"
  },
  radius: {
    sm: "1rem",
    md: "1.5rem",
    lg: "2rem",
    pill: "999px"
  },
  shadow: {
    card: "0 12px 36px rgba(83,97,115,0.08)",
    elevated: "0 18px 48px rgba(83,97,115,0.12)"
  },
  motion: {
    reveal: {
      y: 16,
      duration: 720,
      stagger: 80,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)"
    },
    hover: {
      y: -2,
      scale: 1.015,
      duration: 240,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)"
    }
  }
};
