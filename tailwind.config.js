/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- ДОБАВЬТЕ ВОТ ЭТУ СТРОЧКУ ОБЯЗАТЕЛЬНО!
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}