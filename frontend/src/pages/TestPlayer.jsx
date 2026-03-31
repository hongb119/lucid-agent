import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // 필수: URL 파라미터 읽기용
import axios from 'axios';

const TestPlayer = () => {
  const [questions, setQuestions] = useState([]); // 전체 문제 배열
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 문항 번호 (0부터 시작)
  const [userAnswers, setUserAnswers] = useState({}); // 사용자 선택 답안 저장
  const [isFinished, setIsFinished] = useState(false); // 시험 종료 상태
  const [loading, setLoading] = useState(true); // 로딩 상태 관리

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  
  // URL에서 파라미터 추출 (없으면 기본값 설정)
  const branch = queryParams.get('branch') || 'HEAD';
  const level = queryParams.get('level') || 'Stem';

  // 1. 시험지 불러오기
  useEffect(() => {
    setLoading(true);
    // 백엔드 주소: /api/level_test/questions (Prefix 확인 필수)
    axios.get(`/api/level_test/questions?level=${level}&branch_code=${branch}`)
      .then(res => {
        // 백엔드 리턴 구조가 { questions: [...] } 인 경우
        if (res.data && res.data.questions) {
          setQuestions(res.data.questions);
        } else {
          console.error("데이터 구조가 올바르지 않습니다:", res.data);
        }
      })
      .catch(err => {
        console.error("시험지 로딩 실패:", err);
        alert("시험지를 불러오지 못했습니다. 주소나 백엔드 상태를 확인하세요.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [level, branch]);

  // 현재 문제 데이터 안전하게 가져오기 (데이터가 없을 때 에러 방지)
  const currentQ = questions.length > 0 ? questions[currentIndex] : null;

  // 2. 답안 선택 및 다음 문제로 이동
  const handleAnswer = (selected) => {
    // 답안 저장 (q_number를 키값으로 사용)
    const newAnswers = { ...userAnswers, [currentQ.q_number]: selected };
    setUserAnswers(newAnswers);
    
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitFinalResults(newAnswers);
    }
  };

  // 3. 최종 결과 제출 로직
  const submitFinalResults = (finalAnswers) => {
    setIsFinished(true);
    
    const submitData = {
      level: level,
      branch_code: branch,
      temp_name: "Guest_User", // 나중에 이름 입력 받으면 수정 가능
      answers: finalAnswers
    };

    axios.post('/api/level_test/submit', submitData)
      .then(res => {
        alert("시험이 완료되었습니다. 결과가 저장되었습니다.");
      })
      .catch(err => {
        console.error("결과 전송 실패:", err);
        alert("결과 저장 중 오류가 발생했습니다.");
      });
  };

  // --- 화면 렌더링 분기 ---

  // 로딩 중일 때
  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}><h3>문제를 불러오는 중입니다...</h3></div>;
  }

  // 데이터가 없을 때
  if (questions.length === 0) {
    return <div style={{ padding: '50px', textAlign: 'center' }}><h3>등록된 시험 문제가 없습니다. (Level: {level})</h3></div>;
  }

  // 시험 종료 후 화면
  if (isFinished) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>시험 종료</h2>
        <p>수고하셨습니다. 모든 답안이 제출되었습니다.</p>
        <button onClick={() => window.close()}>창 닫기</button>
      </div>
    );
  }

  // 정상 시험 화면
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      {/* 상단 진행 바 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#666' }}>
        <span>Level: <strong>{level}</strong></span>
        <span>문제 {currentIndex + 1} / {questions.length}</span>
      </div>

      <div style={{ height: '10px', backgroundColor: '#eee', borderRadius: '5px', marginBottom: '30px' }}>
        <div style={{ 
          width: `${((currentIndex + 1) / questions.length) * 100}%`, 
          height: '100%', 
          backgroundColor: '#4CAF50', 
          borderRadius: '5px',
          transition: 'width 0.3s ease'
        }}></div>
      </div>

      {/* 문제 영역 */}
      <div className="question-card" style={{ border: '1px solid #ddd', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h4 style={{ color: '#2196F3', marginBottom: '10px' }}>[{currentQ.category}]</h4>
        <h2 style={{ marginBottom: '20px', lineHeight: '1.4' }}>{currentQ.question_text}</h2>
        
        {currentQ.sub_text && <p style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>{currentQ.sub_text}</p>}

        {/* 오디오 플레이어 (오디오가 있는 경우) */}
        {currentQ.audio_url && (
          <div style={{ marginBottom: '25px' }}>
            <audio src={currentQ.audio_url} controls autoPlay style={{ width: '100%' }} />
          </div>
        )}

        {/* 보기 선택 영역 (4지선다) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['a', 'b', 'c', 'd'].map(key => {
            const optionText = currentQ[`option_${key}`];
            if (!optionText) return null; // 보기가 없는 경우 출력 안함

            return (
              <button 
                key={key} 
                onClick={() => handleAnswer(key)}
                style={{
                  padding: '15px 20px',
                  textAlign: 'left',
                  fontSize: '16px',
                  cursor: 'pointer',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#f0f7ff'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
              >
                <strong>{key.toUpperCase()}.</strong> {optionText}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TestPlayer;