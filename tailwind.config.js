/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'co-navy': '#003A6F',
        'co-red': '#D03027',
        'co-bg': '#F4F6F8',
      },
    },
  },
  plugins: [],
}
