/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    spacing: {
      "xs": "4px",
      "sm": "8px",
      "md": "16px",
      "lg": "24px",
      "xl": "32px",
      "xxl": "48px",
      "0": "0",
      "0.5": "2px",
      "1": "4px",
      "2": "8px",
      "3": "12px",
      "4": "16px",
    },
    fontSize: {
      "xs": "10px",
      "sm": "11px",
      "md": "12px",
      "lg": "14px",
      "xl": "16px",
      "xxl": "18px",
    },
    fontFamily: {
      "sans": ['"MS Sans Serif"', "Arial", "sans-serif"],
    },
    boxShadow: {
      "xp-inset": "inset 1px 1px 0 rgba(255,255,255,0.5), inset -1px -1px 0 rgba(0,0,0,0.3)",
    },
    backgroundImage: {
      "gradient-modal": "linear-gradient(90deg, var(--color-accent), var(--color-warmth))",
    },
    extend: {
      height: {
        "13.5": "54px",
        "10.5": "42px",
      },
      minHeight: {
        "13.5": "54px",
        "10.5": "42px",
      },
      width: {
        "12.5": "50px",
        "50": "200px",
        "55": "220px",
      },
    },
  },
};
