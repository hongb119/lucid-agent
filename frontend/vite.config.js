import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // 모든 서브도메인에서의 접속을 허용합니다.
    allowedHosts: ['.lucidenglish.co.kr', 'localhost', '127.0.0.1'],
    hmr: {
      protocol: 'ws',
      clientPort: 80, 
      // [고정] host를 비워두면 브라우저 주소창의 도메인을 자동으로 따라갑니다.
      host: undefined, 
    },
    proxy: {
      '/api': {
        target: 'http://lucid_agent_be:8000', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})