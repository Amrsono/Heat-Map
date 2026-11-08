/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#111726',
        accent: '#10b981',
        surge: {
          low: '#10b981',     // 1.0 - 1.2x green
          medium: '#f59e0b',  // 1.3 - 1.6x amber
          high: '#ef4444',    // 1.7 - 2.1x red
          extreme: '#8b5cf6', // 2.2x+ purple
        }
      },
    },
  },
  plugins: [],
};
