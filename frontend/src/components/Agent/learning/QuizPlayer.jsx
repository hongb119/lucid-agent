import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Space, Typography, Radio, message, Result } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SoundOutlined, 
  RightOutlined,
  TrophyFilled
} from '@ant-design/icons';

const { Title, Text } = Typography;

const QuizPlayer = ({ data, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // 퀴즈 데이터 (나중에 DB에서 가져올 내용)
  const questions = data || [
    {
      id: 1,
      question: "다음 소리를 듣고 알맞은 단어를 고르세요.",
      audioText: "Apple",
      options: ["Apple", "Banana", "Cherry", "Grape"],
      answer: "Apple",
      image: "🍎"
    },
    {
      id: 2,
      question: "이 동물의 이름은 무엇인가요? 🐘",
      audioText: "Elephant",
      options: ["Lion", "Tiger", "Elephant", "Rabbit"],
      answer: "Elephant",
      image: "🐘"
    },
    {
      id: 3,
      question: "'컴퓨터'의 올바른 영어 철자를 고르세요.",
      audioText: "Computer",
      options: ["Computar", "Computer", "Competer", "Komputer"],
      answer: "Computer",
      image: "💻"
    }
  ];

  const currentQuiz = questions[currentIndex];

  // 음성 출력 (TTS)
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 문제 시작 시 소리 들려주기
  useEffect(() => {
    if (!showResult) {
      speak(currentQuiz.audioText);
    }
  }, [currentIndex, showResult]);

  // 정답 확인
  const handleSubmit = () => {
    if (selectedAnswer === null) {
      message.warning("정답을 선택해 주세요!");
      return;
    }
    
    setIsSubmitted(true);
    if (selectedAnswer === currentQuiz.answer) {
      setScore(score + 1);
      message.success("정답입니다! 참 잘했어요 👏");
    } else {
      message.error("아쉬워요! 다시 한번 확인해 볼까요?");
    }
  };

  // 다음 문제로 이동
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsSubmitted(false);
    } else {
      setShowResult(true);
    }
  };

  // 결과 화면
  if (showResult) {
    const finalScore = Math.round((score / questions.length) * 100);
    return (
      <Result
        icon={<TrophyFilled style={{ color: '#faad14', fontSize: '72px' }} />}
        status="success"
        title={<Title level={2}>퀴즈 완료! 최고예요!</Title>}
        subTitle={<Title level={4}>나의 점수: {finalScore}점 ({score} / {questions.length})</Title>}
        extra={[
          <Button type="primary" size="large" key="back" onClick={() => onFinish(finalScore)} style={{ borderRadius: '20px', width: '200px' }}>
            내 리포트로 돌아가기
          </Button>
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '30px 20px' }}>
      {/* 상단 진행률 */}
      <div style={{ marginBottom: 30 }}>
        <Text strong style={{ color: '#52c41a' }}>Quiz Step 2</Text>
        <Progress percent={Math.round((currentIndex / questions.length) * 100)} strokeColor="#52c41a" />
      </div>

      <Card 
        bordered={false} 
        style={{ borderRadius: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', textAlign: 'center' }}
      >
        <div style={{ fontSize: '60px', marginBottom: 10 }}>{currentQuiz.image}</div>
        <Title level={4} style={{ marginBottom: 20 }}>{currentQuiz.question}</Title>
        
        <Button 
          icon={<SoundOutlined />} 
          onClick={() => speak(currentQuiz.audioText)}
          style={{ marginBottom: 30, borderRadius: '20px' }}
        >
          다시 듣기 (Listen)
        </Button>

        {/* 객관식 버튼 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentQuiz.options.map((opt) => {
            let type = "default";
            if (isSubmitted) {
              if (opt === currentQuiz.answer) type = "primary"; // 정답은 파란색
              else if (opt === selectedAnswer) type = "danger"; // 내가 고른 오답은 빨간색
            } else if (selectedAnswer === opt) {
              type = "primary";
            }

            return (
              <Button 
                key={opt}
                size="large"
                type={type}
                disabled={isSubmitted}
                onClick={() => setSelectedAnswer(opt)}
                style={{ 
                  height: '50px', 
                  borderRadius: '15px', 
                  fontSize: '18px', 
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {opt}
                {isSubmitted && opt === currentQuiz.answer && <CheckCircleOutlined style={{ marginLeft: 10 }} />}
                {isSubmitted && opt === selectedAnswer && opt !== currentQuiz.answer && <CloseCircleOutlined style={{ marginLeft: 10 }} />}
              </Button>
            );
          })}
        </div>

        <div style={{ marginTop: 40 }}>
          {!isSubmitted ? (
            <Button 
              type="primary" 
              size="large" 
              block 
              shape="round" 
              onClick={handleSubmit}
              style={{ height: '55px', backgroundColor: '#52c41a', borderColor: '#52c41a', fontSize: '20px' }}
            >
              정답 확인하기
            </Button>
          ) : (
            <Button 
              type="primary" 
              size="large" 
              block 
              shape="round" 
              onClick={handleNext}
              icon={<RightOutlined />}
              style={{ height: '55px', fontSize: '20px' }}
            >
              {currentIndex === questions.length - 1 ? "결과 보기" : "다음 문제"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default QuizPlayer;