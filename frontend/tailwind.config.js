/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        crt: "#0A0A0A", // background: a switched-off screen
        panel: "#111111",
        line: "#2A2A2A", // grid dividing lines
        phosphor: "#EAEAEA", // main text
        dim: "#8A8A8A", // secondary text
        hazard: "#E61919", // the only accent
        signal: "#4AF626", // reserved for the "verified" mark
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "Consolas", "monospace"],
        display: ["var(--font-display)", "Arial Black", "Impact", "sans-serif"],
      },
      borderRadius: {
        none: "0",
      },
    },
  },
  plugins: [],
};
