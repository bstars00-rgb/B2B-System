import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Node 실행 컨텍스트의 process.env (launch 도구가 PORT를 주입) — @types/node 없이 선언
declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
});
