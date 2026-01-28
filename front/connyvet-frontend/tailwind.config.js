/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fbf7fc',
          100: '#f6eef8',
          200: '#ead9ef',
          300: '#d7b7de',
          400: '#c69fcd',
          500: '#b695c0', // ✅ tu color principal
          600: '#a47fb0',
          700: '#8d6799',
          800: '#75537f',
          900: '#5f4467',
        },
      },
    },
  },
  plugins: [],
};
