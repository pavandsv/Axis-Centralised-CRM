/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        af: {
          bg: '#F2F5FA',
          border: '#E4E9F2',
          muted: '#475569',
          text: '#0F172A',
          dim: '#94A3B8',
          maroon: {
            DEFAULT: '#861D3F',
            50: '#FDF0F4',
          },
        },
        brand: {
          DEFAULT: '#861D3F',
          dark: '#6B1532',
          deep: '#5D1028',
          light: '#A42B55',
          hover: '#A8284F',
          tint: '#FDF0F4',
          tint2: '#FADDE8',
        },
      },
      boxShadow: {
        maroon: '0 4px 16px rgba(134, 29, 63, 0.25)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
    },
  },
  plugins: [],
}
