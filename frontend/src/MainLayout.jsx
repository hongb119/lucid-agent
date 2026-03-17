import React, { useEffect, useState } from 'react';
import { Spin, Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import AdminMain from './pages/AdminMain'; 
import StudentMain from './pages/StudentMain'; // 🚩 학생용 메인 추가

const MainLayout = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedInfo = localStorage.getItem('userInfo');
    if (savedInfo) {
      setUser(JSON.parse(savedInfo));
    } else {
      navigate('/'); 
    }
    setLoading(false);
  }, [navigate]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Spin size="large" /></div>;

  switch (user?.role) {
    case 'ADMIN':
    case 'HQ':
      return <AdminMain user={user} />; 
    
    case 'TEACHER':
      return <div style={{padding: 50}}>선생님 화면 (준비중) - 사용자: {user.userId}</div>;
    
    case 'STUDENT':
      // 🚩 학생 화면으로 user 정보를 넘겨줍니다 (orgId, userId 포함됨)
      return <StudentMain user={user} />; 
    
    default:
      return <Result status="403" title="권한 없음" extra={<Button onClick={() => navigate('/')}>홈으로</Button>} />;
  }
};

export default MainLayout;