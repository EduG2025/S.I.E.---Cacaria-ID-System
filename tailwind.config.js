/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0f172a',   // Slate 900
          secondary: '#1e293b', // Slate 800
          accent: '#06b6d4',    // Cyan 500
          light: '#94a3b8',     // Slate 400
          dark: '#020617',      // Slate 950
        }
      }
    },
  },
  plugins: [],
}