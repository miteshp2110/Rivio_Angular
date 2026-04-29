/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  // This safelist forces Tailwind to compile these colors so they never disappear
  safelist: [
    { pattern: /bg-(green|yellow|red|blue|gray|teal|indigo|purple|pink|cyan|emerald|amber|rose)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(green|yellow|red|blue|gray|teal|indigo|purple|pink|cyan|emerald|amber|rose)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(green|yellow|red|blue|gray|teal|indigo|purple|pink|cyan|emerald|amber|rose)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /shadow-(green|yellow|red|blue|gray|teal|indigo|purple|pink|cyan|emerald|amber|rose)-(100|200|300|400|500)/ },
    { pattern: /from-(blue|teal|purple|pink|cyan)-(400|500|600)/ },
    { pattern: /to-(indigo|green|violet|rose|blue)-(400|500|600)/ }
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.65)',
          border: 'rgba(255, 255, 255, 0.7)',
        }
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 12px 40px 0 rgba(31, 38, 135, 0.12)',
      },
      backdropBlur: {
        'glass': '20px',
      }
    },
  },
  plugins: [],
}