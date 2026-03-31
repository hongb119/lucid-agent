// src/pages/PlacementMain.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

// 하위 컴포넌트 임포트 (components 폴더 하위)
import TestIntro from '../components/Placement/TestIntro';
import QuestionMultiple from '../components/Placement/QuestionMultiple';
import QuestionSpeaking from '../components/Placement/QuestionSpeaking';

const PlacementMain = () => {
  const [step, setStep] = useState('INTRO'); 
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const branch = queryParams.get('branch') || 'HEAD';
  const level = queryParams.get('level') || 'Stem';

  useEffect(() => {
    // 데이터 로딩
    axios.get(`/api/level_test/questions?level=${level}&branch_code=${branch}`)
      .then(res => {
        if (res.data && res.data.questions) setQuestions(res.data.questions);
      });
  }, [level, branch]);

  const handleNext = (answerData) => {
    const qNum = questions[currentIndex].q_number;
    setUserAnswers(prev => ({ ...prev, [qNum]: answerData }));

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 최종 제출 로직 (생략)
      alert("시험 종료!");
    }
  };

  if (questions.length === 0) return <div>Loading...</div>;

  return (
    <div className="placement-main">
      {/* 1. 인트로 단계 */}
      {step === 'INTRO' && (
        <TestIntro onStart={() => setStep('TESTING')} />
      )}

      {/* 2. 시험 진행 단계 */}
      {step === 'TESTING' && (
        <div className="test-content">
          {/* 문제 번호에 따라 컴포넌트 분기 */}
          {questions[currentIndex].q_number <= 30 ? (
            <QuestionMultiple 
              data={questions[currentIndex]} 
              onNext={handleNext} 
            />
          ) : (
            <QuestionSpeaking 
              data={questions[currentIndex]} 
              onNext={handleNext} 
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PlacementMain;