/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tower: {
          bg: '#0f1117',
          card: '#1a1d27',
          border: '#2a2d3a',
          accent: '#6366f1',
          'accent-hover': '#818cf8',
          success: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
          info: '#3b82f6',
          muted: '#6b7280',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
