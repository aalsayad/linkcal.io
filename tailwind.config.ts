import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        faded20: "#ffffff20",
        faded15: "#ffffff15",
        faded10: "#ffffff10",
        faded8: "#ffffff08",
        faded3: "#ffffff03",
        faded2: "#ffffff02",
        faded1: "#ffffff01",
        greybackground: "#111216",
        greybackground_light: "#18191D",
        black: "#0A0B0F",
        overlay: {
          5: "rgb(13,13,13)",
          10: "rgb(26,26,26)",
          15: "rgb(38,38,38)",
          20: "rgb(51,51,51)",
          30: "rgb(77,77,77)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
} satisfies Config;
