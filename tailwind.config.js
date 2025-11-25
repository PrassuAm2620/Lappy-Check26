/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem"
      }
    }
  },
  plugins: []
};
