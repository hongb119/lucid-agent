import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', 
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['bnlucid.lucid.kr', 'localhost', '127.0.0.1'],
    cors: true, 
    origin: 'http://bnlucid.lucid.kr:5173',
    watch: {
      usePolling: true, // 도커 파일 시스템 변화 감지
    },
    hmr: {
      host: 'bnlucid.lucid.kr',
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://agent-backend:8000', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
})