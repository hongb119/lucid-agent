import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories'; // 1. 만든 파일 임포트

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('itembank_token'));

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => {
    localStorage.removeItem('itembank_token');
    localStorage.removeItem('branch_code'); // 지점 코드도 함께 삭제
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />

        <Route 
          path="/*" 
          element={isLoggedIn ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />} 
        >
          <Route index element={<Dashboard />} />
          {/* 2. 임시 div 대신 Categories 컴포넌트 연결 */}
          <Route path="categories" element={<Categories />} /> 
          <Route path="items" element={<div className="p-10 text-2xl">📝 문항 관리 준비중</div>} />
          <Route path="tests" element={<div className="p-10 text-2xl">📑 시험지 생성 준비중</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;