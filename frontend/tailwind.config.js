/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#faf8ff',
          100: '#f3edff',
          200: '#e7dbff',
          300: '#d4beff',
          400: '#ba96fe',
          500: '#9f6df8',
          600: '#8748ed',
          700: '#7234d5',
          800: '#5e2cb2',
          900: '#4e2591',
        },
        teal: {
          50: '#f0fbfb',
          100: '#d9f4f4',
          200: '#b5e8e8',
          300: '#82d5d6',
          400: '#4ebbbe',
          500: '#319fa4',
          600: '#267e83',
          700: '#21656a',
          800: '#1e5256',
          900: '#1d4548',
        },
        warm: {
          50: '#fdfbf7',
          100: '#f7f4ed',
          200: '#ede8dd',
          300: '#ddd5c4',
          400: '#bfb29c',
          500: '#9e907a',
          800: '#3a352c',
          900: '#26221c',
        },
        navy: {
          50: '#f4f6fa',
          100: '#e8edf4',
          200: '#ccd8e8',
          300: '#a3bad4',
          400: '#7096bc',
          500: '#4f78a4',
          600: '#3c6088',
          700: '#2f4c6e',
          800: '#1b2940',
          900: '#121b2b',
          950: '#0b121e',
        },
        rose: {
          50: '#fff5f7',
          100: '#ffeaf0',
          200: '#fed4df',
          300: '#fcafc3',
          400: '#f67e9f',
          500: '#ea517c',
          600: '#d53463',
          700: '#b3244e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(18, 27, 43, 0.05), 0 4px 6px -2px rgba(18, 27, 43, 0.02)',
        'card': '0 4px 20px -2px rgba(18, 27, 43, 0.06), 0 2px 6px -1px rgba(18, 27, 43, 0.03)',
        'modal': '0 20px 25px -5px rgba(18, 27, 43, 0.1), 0 10px 10px -5px rgba(18, 27, 43, 0.04)',
      }
    },
  },
  plugins: [],
}
