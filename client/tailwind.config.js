/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2F7',
          100: '#D5DEEB',
          200: '#ADBDD7',
          300: '#849CC3',
          400: '#5C7BAF',
          500: '#1E3A5F',
          600: '#1A3254',
          700: '#152A47',
          800: '#10213A',
          900: '#0B172D',
        },
        status: {
          active: '#10B981',
          new: '#3B82F6',
          inactive: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
