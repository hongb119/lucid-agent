import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 외부 접속 허용
    port: 3000,
    strictPort: true,
    hmr: true,       // 로컬 개발 시 실시간 반영 켜기
    // 로컬 hosts 파일에 세팅한 2차 도메인들을 허용
    allowedHosts: ['.lucid.kr', 'localhost'] 
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // 실서버 가맹점 도메인들 허용
    allowedHosts: ['.lucidenglish.co.kr', '.lucideducation.co.kr', 'localhost']
  }
})