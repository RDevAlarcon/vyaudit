import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f8ff",
          100: "#dceeff",
          200: "#b9deff",
          300: "#83c6ff",
          400: "#45a8ff",
          500: "#148aff",
          600: "#006ce0",
          700: "#0053ad",
          800: "#04498d",
          900: "#0a3e73"
        }
      }
    }
  },
  plugins: []
};

export default config;
