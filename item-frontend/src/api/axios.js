import axios from 'axios';

// src/api/axios.js
const instance = axios.create({
  // 절대 주소로 입력하여 리액트 서버가 아닌 백엔드 서버로 직접 쏘게 합니다.
  baseURL: 'http://itembank.lucid.kr:8001/api/itembank', 
  headers: { 'Content-Type': 'application/json' }
});

// 요청 인터셉터: 모든 요청에 토큰과 지점 코드를 자동으로 포함
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('itembank_token');
  const branchCode = localStorage.getItem('branch_code');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (branchCode) {
    config.headers['X-Branch-Code'] = branchCode;
  }
  return config;
});

export default instance;