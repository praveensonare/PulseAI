/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'uob-blue': '#0060AE',
        'uob-red': '#E60012',
      },
    },
  },
  plugins: [],
};
