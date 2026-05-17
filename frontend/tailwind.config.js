/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bellapro: {
          ink: '#1A1A1F',
          plum: '#3B2A35',
          rose: '#E29BA8',
          blush: '#F7C1B6',
          ivory: '#FAF7F6',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        brand: ['Poppins', 'sans-serif'],
        'brand-display': ['"Playfair Display"', 'serif'],
      },
    },
  },
  plugins: [],
};
