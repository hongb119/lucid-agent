import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 1. 개발 서버 설정 (npm run dev용)
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    hmr: false, // 실서버 환경에서는 웹소켓(HMR) 기능을 끄는 것이 안전합니다.
  },

  // 2. 프리뷰 서버 설정 (실서버 배포용 - npm run build 후 실행 시 적용)
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // [중요] 90개 가맹점 및 모든 서브도메인을 한 줄로 허용하는 와일드카드 설정
    allowedHosts: [
      '.lucidenglish.co.kr',      // bnlucid, allucid 등 모든 서브도메인 허용
      '.lucideducation.co.kr',   // 관리자 페이지 등 관련 도메인 허용
      'localhost'                 // 로컬 테스트용
    ]
  },

  // 3. 빌드 설정
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1600,
  }
})