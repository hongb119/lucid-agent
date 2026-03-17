import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 도커 외부(Nginx) 접속 허용
    port: 5173,      // 포트 번호 고정
    allowedHosts: [
      'itembank.lucid.kr', // 이 호스트를 허용하도록 추가
      'lucid.kr',
      'api.lucid.kr'
    ]
  }
})