// tailwind.config.cjs
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],                        // <─ you can switch the whole
                                              //    dashboard to dark by
                                              //    adding class="dark" on <html>
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /*  ↓↓↓  These five lines generate text-border, bg-border, border-border */
        border:      "hsl(var(--border) / <alpha-value>)",
        input:       "hsl(var(--input) / <alpha-value>)",
        ring:        "hsl(var(--ring) / <alpha-value>)",
        background:  "hsl(var(--background) / <alpha-value>)",
        foreground:  "hsl(var(--foreground) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      backdropBlur: {
        xs: "2px",                           // for glassy cards
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
