module.exports = {
  content: ["./src/renderer/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgba(var(--background))",
        text: "rgba(var(--text-color))",
        accent: "rgba(var(--accent-color))",
        inputBg: "rgba(var(--input-background))",
        configBg: "rgba(var(--config-background))",
        buttonBg: "rgba(var(--button-background))",
        cardBg: "rgba(var(--card-background))",
        cardBorder: "rgba(var(--card-border))",
        inputText: "rgba(var(--input-text))",
      },
    },
  },
  variants: {},
  plugins: [],
};
