import axios from 'axios';

// 현재 환경 확인
const currentHost = window.location.hostname;
const currentPort = window.location.port;
const currentProtocol = window.location.protocol;

console.log('=== Phonetics API 설정 ===');
console.log('현재 환경:', {
    host: currentHost,
    port: currentPort,
    protocol: currentProtocol,
    href: window.location.href
});

// 환경별 API baseURL 설정 - .env 사용
function getApiBaseURL() {
    // 개발 환경
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        console.log('개발 환경: .env.development 사용');
        return import.meta.env.VITE_API_URL || 'http://localhost:8000';
    }
    
    // 실서버 환경
    if (currentHost.includes('lucid.kr')) {
        console.log('실서버 환경: .env.production 사용 (상대 경로)');
        // 실서버는 아파치가 중간에서 넘겨주므로 상대 경로 사용
        return import.meta.env.VITE_API_URL || '';
    }
    
    // 기본값
    console.log('기본 환경: 기본 API 서버');
    return 'http://localhost:8000';
}

// axios 설정
const api = axios.create({
    baseURL: getApiBaseURL(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: false,
});

console.log('최종 API baseURL:', api.defaults.baseURL);

// 요청 인터셉터 - 디버깅용
api.interceptors.request.use(
    (config) => {
        console.log('API 요청:', config.url, config.params || config.data);
        return config;
    },
    (error) => {
        console.error('API 요청 에러:', error);
        return Promise.reject(error);
    }
);

// 응답 인터셉터 - 디버깅용
api.interceptors.response.use(
    (response) => {
        console.log('API 응답:', response.config.url, response.data);
        return response;
    },
    (error) => {
        console.error('API 응답 에러:', error.config?.url, error.response?.data || error.message);
        return Promise.reject(error);
    }
);
