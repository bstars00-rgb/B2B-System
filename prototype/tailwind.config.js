/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // 전역 다크모드 — <html>.dark 클래스 기준 (utils/theme.ts). 실제 전환은 index.css의 .dark 오버레이.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 실사이트(ohmyhotel.biz) 브랜드 오렌지 실측 #EF7F29 (2026-07-15) 기준 팔레트
        brand: {
          50: '#FDF3EB',
          100: '#FBE4D1',
          200: '#F7C9A3',
          300: '#F4AD74',
          400: '#F1964A',
          500: '#EF7F29',
          600: '#D96A15',
          700: '#B35711',
          800: '#8C440E',
          900: '#66320A',
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
