import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.lucidenglish.co.kr', 'localhost', '127.0.0.1'],
    hmr: {
      // [고정] 어떤 서브도메인으로 접속하든 웹소켓이 길을 찾게 합니다.
      protocol: 'ws',
      clientPort: 80, 
    },
    proxy: {
      // 모든 API 요청을 백엔드 컨테이너로 전달 (포트 8000 고정)
      '/api': {
        target: 'http://agent-backend:8000', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})