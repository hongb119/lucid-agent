import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // [추가] PHP의 깊은 경로(/student/VideoController/...)에서 리소스가 깨지지 않게 합니다.
  base: '/', 
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // [유지] 어제 설정하신 구체적인 허용 호스트
    allowedHosts: ['bnlucid.lucid.kr', 'localhost', '127.0.0.1'],
    cors: true, 
    // [유지] 마이크 권한(Secure Context)을 위해 필요한 오리진 설정
    origin: 'http://bnlucid.lucid.kr:5173',
    hmr: {
      host: 'bnlucid.lucid.kr',
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://agent-backend:8000', 
        changeOrigin: true,
        secure: false,
        // 백엔드 소스에 이미 /api가 포함되어 있으므로 rewrite는 절대 하지 않습니다.
      }
    }
  }
})