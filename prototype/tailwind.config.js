/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF6EC',
          100: '#FCE9D2',
          200: '#F9D0A0',
          300: '#F6B66D',
          400: '#F49F45',
          500: '#F28C28',
          600: '#D9750F',
          700: '#B35D0C',
          800: '#8C4809',
          900: '#663406',
        },
      },
      fontFamily: {
        // 실사이트(ohmyhotel.biz) body font-family 실측값 그대로 (2026-07-15)
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
