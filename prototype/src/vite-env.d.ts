/// <reference types="vite/client" />

// 이미지 에셋 import (tsc 용 — Vite가 base 반영한 URL 문자열로 변환)
declare module '*.jpg' {
  const src: string;
  export default src;
}
declare module '*.png' {
  const src: string;
  export default src;
}
