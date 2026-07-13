import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f6ff',
          500: '#0066cc',
          600: '#004499',
          700: '#003366'
        },
        gray: {
          50: '#f8f9fa',
          100: '#e9ecef',
          200: '#dee2e6',
          300: '#ced4da',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#495057',
          700: '#343a40',
          800: '#212529',
          900: '#000000'
        },
        'ubc-blue': '#1e293b',
        'ubc-light': '#3b82f6',
        'accent-gold': '#f59e0b',
        'primary-blue': '#2563eb',
        'secondary-cyan': '#06b6d4',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        clash: ['Clash Display', 'sans-serif'],
      }
    },
  },
  plugins: [forms],
} 