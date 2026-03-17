import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // axios 인스턴스 가져오기

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. 백엔드 로그인 API 호출
      const res = await api.post('/auth/login', { username, password });
      
      // 2. 서버에서 받은 데이터 저장 (중요!)
      localStorage.setItem('itembank_token', res.data.access_token);
      localStorage.setItem('branch_code', res.data.branch_code); // 지점 코드 저장!
      localStorage.setItem('user_name', res.data.user_name || username);

      onLogin();
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.logo}>LUCID 문제은행</h1>
          <p style={styles.subText}>Management System</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Admin ID"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Password"
            />
          </div>

          <button type="submit" style={styles.button}>로그인</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', // 진한 블루 그라데이션
    margin: 0,
    padding: 0,
    overflow: 'hidden'
  },
  container: {
    width: '100%',
    maxWidth: '420px',
    padding: '50px 40px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column'
  },
  header: { marginBottom: '40px' },
  logo: {
    fontSize: '42px',
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: '2px',
    margin: 0
  },
  subText: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  inputGroup: { textAlign: 'left' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px',
    marginLeft: '4px'
  },
  input: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    fontSize: '16px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'all 0.3s ease',
    backgroundColor: '#f8fafc'
  },
  button: {
    width: '100%',
    padding: '18px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    transition: 'transform 0.2s'
  },
  arrow: { fontSize: '20px' },
  footer: {
    marginTop: '30px',
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: '1.6'
  }
};

export default Login;