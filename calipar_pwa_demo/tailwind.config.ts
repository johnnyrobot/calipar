import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#102F3D",
        "ink-deep": "#07232F",
        sea: "#0B6E75",
        "sea-light": "#C7E5DF",
        tide: "#68B8B0",
        coral: "#E96752",
        sand: "#F5F0E5",
        paper: "#FFFCF5",
        mist: "#E9F1EF",
        gold: "#D8A443",
      },
      fontFamily: {
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        sans: ["Avenir Next", "Avenir", "Century Gothic", "Optima", "sans-serif"],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
      },
      boxShadow: {
        card: "0 20px 60px -30px rgba(7, 35, 47, .38)",
        lift: "0 24px 48px -20px rgba(7, 35, 47, .48)",
      },
    },
  },
  plugins: [],
};

export default config;
