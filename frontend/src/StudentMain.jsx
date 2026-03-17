import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { BookOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons';
import StudentDashboard from './StudentDashboard'; // 이후 개발할 대시보드

const { Header, Content, Sider } = Layout;

const StudentMain = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  // 학생용 메뉴 아이템
  const items = [
    { key: '1', icon: <DashboardOutlined />, label: '나의 학습 현황' },
    { key: '2', icon: <BookOutlined />, label: '오늘의 숙제' },
    { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃' },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      localStorage.removeItem('userInfo');
      window.location.href = '/';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div className="p-4 text-white text-center font-bold text-lg">
          {collapsed ? 'L' : 'LUCID STUDENT'}
        </div>
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline" items={items} onClick={handleMenuClick} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="font-bold">{user.branchName} 지점</span>
          <span><b>{user.userName}</b> 학생님 환영합니다</span>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
            {/* 여기에 학생용 세부 페이지를 넣습니다. 우선 대시보드 표시 */}
            <StudentDashboard orgId={user.orgId} userId={user.userId} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default StudentMain;