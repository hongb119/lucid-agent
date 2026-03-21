import React, { useState, useEffect, useRef, createContext } from 'react';
import { Routes, Route } from 'react-router-dom';

// 1. 컴포넌트 및 위젯 임포트
import AgentWidget from './components/Agent/AgentWidget';

// 2. 페이지 컴포넌트 임포트 (누락된 부분 모두 추가)
import SpeakingStudyPage from './pages/SpeakingStudyPage';
import SmallTalk from './pages/SmallTalk';
import PatternDrill from './pages/PatternDrill';
import VocaMain from './pages/VocaMain';
import DictaMain from './pages/DictaMain';
import RSentenceMain from './pages/RSentenceMain';
import PhoneticsMain from './pages/PhoneticsMain';

// [핵심] 하위 페이지에서 에이전트를 부를 수 있게 Context 생성 및 내보내기
export const AgentContext = createContext();

const App = () => {
  const [user, setUser] = useState(null);
  
  // 에이전트 위젯을 직접 조종할 Ref
  const agentRef = useRef();

  useEffect(() => {
    // PHP 세션 연동 확인
    if (window.LUCID_SESSION) {
      console.log("PHP Session 확인:", window.LUCID_SESSION);
      setUser(window.LUCID_SESSION);
      localStorage.setItem('userInfo', JSON.stringify(window.LUCID_SESSION));
    }
  }, []);

  // 에이전트 호출 공통 함수
  const triggerAgent = (taskData) => {
    if (agentRef.current) {
      // AgentWidget에 구현한 sayHello 또는 trigger 함수를 호출합니다.
      agentRef.current.sayHello(taskData);
    }
  };

  return (
    // 3. Provider로 감싸서 모든 하위 페이지에 triggerAgent 함수 공유
    <AgentContext.Provider value={{ triggerAgent }}>
      <div className="App">
        
        {/* 4. AI 위젯: 캐릭터는 항상 표시, ref로 조종 가능하게 설정 */}
        <AgentWidget ref={agentRef} user={user || {user_id: 'debug_user'}} />

        <Routes>
          {/* 학습창 라우팅 설정 */}
          <Route path="/speaking" element={<SpeakingStudyPage />} />
          <Route path="/smalltalk" element={<SmallTalk />} />
          <Route path="/pattern" element={<PatternDrill />} />
          <Route path="/patterndrill" element={<PatternDrill />} />
          
          {/* 단어 학습 (Voca) */}
          <Route path="/voca" element={<VocaMain />} />
          <Route path="/rvoca" element={<VocaMain />} />
          
          {/* 받아쓰기 (Dicta) */}
          <Route path="/dicta" element={<DictaMain />} />
          
          {/* 문장 복습 및 파닉스 */}
          <Route path="/rsentence" element={<RSentenceMain />} />
          <Route path="/phonetics" element={<PhoneticsMain />} />
          <Route path="/phonics" element={<PhoneticsMain />} />

          {/* 기본 메인 화면 */}
          <Route path="/" element={
            <div style={{padding: '50px', textAlign: 'center'}}>
              <h1>Lucid Speaking Test Mode</h1>
              <p>현재 실서버 이관을 위해 스피킹 모듈을 디버깅 중입니다.</p>
              {user && <p>접속 계정: <strong>{user.user_id}</strong></p>}
            </div>
          } />

          {/* 404 페이지 처리 */}
          <Route path="*" element={
            <div style={{padding: '40px', textAlign: 'center'}}>
              <h2 style={{color: '#ff4b4b'}}>이관 작업 중인 페이지입니다.</h2>
              <p><strong>요청 경로:</strong> {window.location.pathname}</p>
              <button onClick={() => window.history.back()} style={{marginTop: '20px', padding: '10px 20px', cursor: 'pointer'}}>뒤로가기</button>
            </div>
          } />
        </Routes>
      </div>
    </AgentContext.Provider>
  );
};

export default App;