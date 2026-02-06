/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tower: {
          bg: 'var(--tower-bg)',
          card: 'var(--tower-card)',
          border: 'var(--tower-border)',
          accent: 'var(--tower-accent)',
          'accent-hover': 'var(--tower-accent-hover)',
          success: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
          info: '#3b82f6',
          muted: 'var(--tower-muted)',
          text: 'var(--tower-text)',
          'text-secondary': 'var(--tower-text-secondary)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
