import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

const Layout = ({ onLogout }) => {
  const navigate = useNavigate();

  // 로그인 시 저장했던 지점 코드와 사용자 이름을 가져옵니다.
  const branchCode = localStorage.getItem('branch_code') || 'Unknown';
  const userName = localStorage.getItem('user_name') || '관리자';

  const handleLogoutClick = () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      onLogout();
      navigate('/login');
    }
  };

  return (
    <div style={styles.container}>
      {/* 1. 사이드바 영역 */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>루시드 문제은행 시스템</div>
        <nav style={styles.nav}>
          <Link to="/" style={styles.link}>📊 대시보드</Link>
          <Link to="/categories" style={styles.link}>📂 카테고리 관리</Link>
          <Link to="/items" style={styles.link}>📝 문항 은행</Link>
          <Link to="/tests" style={styles.link}>📑 시험지 생성</Link>
        </nav>
        
        <div style={styles.userInfo}>
            <div style={styles.userName}>{userName} 님</div>
            <button onClick={handleLogoutClick} style={styles.logoutBtn}>
              로그아웃
            </button>
        </div>
      </aside>

      {/* 2. 메인 컨텐츠 영역 */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerRight}>
            <span style={styles.branchBadge}>지점 코드: {branchCode}</span>
          </div>
        </header>

        <section style={styles.content}>
          {/* App.jsx의 Route 자식 컴포넌트(Categories 등)가 여기에 표시됨 */}
          <Outlet /> 
        </section>
      </main>
    </div>
  );
};

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' },
  
  // 사이드바 스타일
  sidebar: {
    width: '260px', backgroundColor: '#1e293b', color: '#fff',
    display: 'flex', flexDirection: 'column', padding: '24px'
  },
  logo: { fontSize: '24px', fontWeight: '900', marginBottom: '48px', color: '#3b82f6', textAlign: 'center' },
  nav: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  link: {
    color: '#cbd5e1', textDecoration: 'none', padding: '14px 18px',
    borderRadius: '10px', transition: 'all 0.2s', fontSize: '15px', fontWeight: '500'
  },
  
  // 사용자 정보 및 로그아웃
  userInfo: { marginTop: 'auto', borderTop: '1px solid #334155', paddingTop: '20px' },
  userName: { color: '#f8fafc', fontSize: '14px', marginBottom: '10px', textAlign: 'center' },
  logoutBtn: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
    backgroundColor: '#334155', color: '#ef4444', cursor: 'pointer', fontWeight: '600'
  },

  // 메인 영역 스타일
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  header: {
    height: '64px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'flex-end'
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  branchBadge: { 
    backgroundColor: '#eff6ff', color: '#1e40af', padding: '6px 14px', 
    borderRadius: '20px', fontSize: '13px', fontWeight: '600' 
  },
  content: { padding: '32px', minHeight: 'calc(100vh - 64px)' }
};

export default Layout;