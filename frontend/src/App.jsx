import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
// import AgentWidget from './components/Agent/AgentWidget'; 

import SpeakingStudyPage from './pages/SpeakingStudyPage';
import VideoStudy from './pages/VideoStudy';
import SmallTalk from './pages/SmallTalk';
import PatternDrill from './pages/PatternDrill';
import VocaMain from './pages/VocaMain';
import DictaMain from './pages/DictaMain';
import RSentenceMain from './pages/RSentenceMain';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // PHP 세션 연동 확인용 로그 추가
    if (window.LUCID_SESSION) {
      console.log("PHP Session 확인:", window.LUCID_SESSION);
      setUser(window.LUCID_SESSION);
      localStorage.setItem('userInfo', JSON.stringify(window.LUCID_SESSION));
    }
  }, []);

  return (
    <div className="App">
      {/* 1. AI 위젯: 테스트 단계에서는 임시 주석 처리 */}
      {/* <AgentWidget userId={user?.user_id} /> */}

      <Routes>
        {/* [실서버 이관 1단계] AI 스피킹 집중 테스트 */}
        <Route path="/speaking" element={<SpeakingStudyPage />} />
        <Route path="/smalltalk" element={<SmallTalk />} />
        <Route path="/pattern" element={<PatternDrill />} />
        <Route path="/patterndrill" element={<PatternDrill />} />
        <Route path="/voca" element={<VocaMain />} />
        <Route path="/dicta" element={<DictaMain />} />
        <Route path="/rvoca" element={<DictaMain />} />
        <Route path="/rsentence" element={<RSentenceMain />} />
        {/* 나머지 메뉴는 주석 처리하여 단계별로 오픈 */}
        {/* 
        
         <Route path="/videoStudy" element={<VideoStudy />} />
        
        */}

        {/* 기본 메인 화면 */}
        <Route path="/" element={
          <div style={{padding: '50px', textAlign: 'center'}}>
            <h1>Lucid Speaking Test Mode</h1>
            <p>현재 실서버 이관을 위해 스피킹 모듈을 디버깅 중입니다.</p>
            {user && <p>접속 계정: {user.user_id}</p>}
          </div>
        } />

        <Route path="*" element={
          <div style={{padding: '40px', textAlign: 'center'}}>
            <h2 style={{color: '#ff4b4b'}}>이관 작업 중인 페이지입니다.</h2>
            <p><strong>요청 경로:</strong> {window.location.pathname}</p>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default App;