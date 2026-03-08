/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['var(--font-cairo)', 'sans-serif'],
      },
      colors: {
        accent: {
          blue: '#4f8ef7',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#f59e0b',
          purple: '#a855f7',
        },
      },
    },
  },
  plugins: [],
}
