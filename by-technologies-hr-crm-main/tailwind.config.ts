import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        by: {
          dark: "#162E3D",
          darkHover: "#234358",
          darkActive: "#0F202B",
          green: "#45C512",
          greenHover: "#39A90E",
          greenLight: "#EEF9EB",
          greenMuted: "#D5F2CD",
          bg: "#F5F9F7",
          card: "#FFFFFF",
          border: "#DDEAE2",
          borderDark: "#203F54",
          muted: "#5B7586",
          subtle: "#7A94A4",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        by: "0 2px 8px -2px rgba(22, 46, 61, 0.06), 0 4px 16px -4px rgba(22, 46, 61, 0.08)",
        "by-lg": "0 10px 25px -5px rgba(22, 46, 61, 0.1), 0 8px 10px -6px rgba(22, 46, 61, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
