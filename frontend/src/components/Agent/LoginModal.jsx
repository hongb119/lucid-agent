import React, { useState } from 'react';
import axios from 'axios';

const LoginModal = ({ onClose }) => {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!id || !pw) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // 1. 백엔드 API 호출 (FastAPI 서버 주소를 확인하세요)
      const res = await axios.post('http://localhost:8000/auth/login', { 
        login_id: id, 
        password: pw 
      });

      // 2. 응답 데이터 구조화
      // 서버에서 전달하는 키값(user_id, role, org_id 등)이 일치하는지 확인이 필요합니다.
      const userInfo = {
        userId: res.data.user_id,
        loginId: res.data.login_id,
        name: res.data.name,
        role: res.data.role, // ADMIN, STUDENT, TEACHER, HQ
        orgId: res.data.org_id // 지점 코드
      };

      // 3. 로컬스토리지에 저장 (MainLayout에서 이 정보를 읽어 분기함)
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      localStorage.setItem('isLoggedIn', 'true');

      alert(`${res.data.name}님, 반갑습니다!`);
      
      // 4. 모달 닫기
      onClose();

      // 5. [핵심] 페이지 새로고침
      // 리프레시 직후 App.jsx가 실행되면서 isLoggedIn이 true인 것을 감지하고 MainLayout을 띄웁니다.
      window.location.reload();

    } catch (err) {
      console.error("로그인 에러:", err);
      if (err.response && err.response.status === 401) {
        alert("아이디 또는 비밀번호가 틀립니다.");
      } else {
        alert("서버 연결에 실패했습니다. 백엔드(main.py) 서버를 확인하세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 엔터 키 입력 시 로그인 실행
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* 헤더 영역 */}
        <div className="bg-[#003366] p-8 text-center">
          <h2 className="text-3xl font-black text-white tracking-tight">LUCID ACADEMY</h2>
          <p className="text-blue-200 text-sm mt-2 font-medium uppercase tracking-widest">Integrated Management System</p>
        </div>

        {/* 입력 영역 */}
        <div className="p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">User ID</label>
            <input 
              type="text"
              className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003366] transition-all font-medium" 
              placeholder="아이디를 입력하세요" 
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Password</label>
            <input 
              type="password"
              className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-[#003366] transition-all font-medium" 
              placeholder="비밀번호를 입력하세요" 
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 cursor-pointer
              ${loading ? 'bg-gray-400' : 'bg-[#003366] text-white hover:bg-blue-900'}`}
          >
            {loading ? '인증 중...' : '로그인'}
          </button>

          <button 
            onClick={onClose} 
            className="w-full text-gray-400 font-bold text-sm mt-2 hover:text-gray-600 transition-colors"
          >
            나중에 로그인하기
          </button>
        </div>

        {/* 하단 장식 */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
            LUCID Academy ERP V2.0 - Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;