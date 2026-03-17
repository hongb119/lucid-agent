import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Input, Typography, Space, message } from 'antd';
import { 
  SoundOutlined, 
  ArrowRightOutlined, 
  CheckCircleFilled,
  QuestionCircleOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const PartialDictationPlayer = ({ data, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(null);
  const inputRef = useRef(null);

  // 데이터 예시: 앞부분(display)과 채워야 할 정답(answer)을 분리
  const words = data || [
    { full: "apple", display: "app", answer: "le", meaning: "사과", image: "🍎" },
    { full: "elephant", display: "eleph", answer: "ant", meaning: "코끼리", image: "🐘" },
    { full: "computer", display: "comp", answer: "uter", meaning: "컴퓨터", image: "💻" },
    { full: "banana", display: "ban", answer: "ana", meaning: "바나나", image: "🍌" },
  ];

  const current = words[currentIndex];

  // 🔊 단어 전체 읽어주기 (TTS)
  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.full);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  // 문제 전환 시 초기화
  useEffect(() => {
    speak();
    setUserInput('');
    setIsCorrect(null);
    // 문제 바뀔 때마다 입력창에 포커스
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [currentIndex]);

  // 정답 확인 로직
  const checkAnswer = () => {
    const cleanInput = userInput.toLowerCase().trim();
    if (cleanInput === current.answer.toLowerCase()) {
      setIsCorrect(true);
      message.success("Good Job! 정확해요.");
    } else {
      setIsCorrect(false);
      message.error("다시 한번 들어보고 채워보세요!");
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      if (onFinish) onFinish();
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      {/* 상단 진행도 */}
      <div style={{ marginBottom: 30 }}>
        <Text strong style={{ color: '#eb2f96' }}>Partial Dictation Training</Text>
        <Progress 
          percent={Math.round(((currentIndex + 1) / words.length) * 100)} 
          strokeColor="#eb2f96" 
          status="active"
        />
      </div>

      <Card 
        variant="borderless" 
        style={{ 
          borderRadius: '30px', 
          boxShadow: '0 15px 45px rgba(235, 47, 150, 0.1)', 
          textAlign: 'center',
          background: '#fffef0' 
        }}
      >
        <div style={{ fontSize: '60px', marginBottom: 10 }}>{current.image}</div>
        <Title level={4} style={{ color: '#8c8c8c', fontWeight: 400 }}>{current.meaning}</Title>

        {/* --- 단어 빈칸 구성 구역 --- */}
        <div style={{ 
          margin: '40px 0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'baseline', 
          gap: '2px',
          background: '#fff',
          padding: '20px',
          borderRadius: '15px',
          border: '1px solid #ffe7f3'
        }}>
          {/* 제시된 앞글자 */}
          <span style={{ fontSize: '50px', fontWeight: '800', color: '#333', letterSpacing: '2px' }}>
            {current.display}
          </span>
          
          {/* 입력해야 할 빈칸 */}
          <Input 
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onPressEnter={isCorrect ? handleNext : checkAnswer}
            disabled={isCorrect}
            placeholder="???"
            style={{ 
              width: `${current.answer.length * 35 + 30}px`, 
              fontSize: '50px', 
              fontWeight: '800',
              height: '70px',
              textAlign: 'center',
              color: '#eb2f96',
              borderBottom: `5px solid ${isCorrect ? '#52c41a' : '#eb2f96'}`,
              borderTop: 0, borderLeft: 0, borderRight: 0,
              borderRadius: 0,
              padding: 0,
              backgroundColor: 'transparent',
              outline: 'none'
            }}
          />
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Button 
            shape="round" 
            icon={<SoundOutlined />} 
            onClick={speak}
            style={{ height: '45px', padding: '0 30px' }}
          >
            Listen Again (다시 듣기)
          </Button>

          <div style={{ marginTop: 10 }}>
            {!isCorrect ? (
              <Button 
                type="primary" 
                size="large" 
                block 
                onClick={checkAnswer} 
                style={{ height: '55px', borderRadius: '15px', backgroundColor: '#eb2f96', borderColor: '#eb2f96', fontSize: '18px' }}
              >
                Check Answer (확인)
              </Button>
            ) : (
              <Button 
                type="primary" 
                size="large" 
                block 
                onClick={handleNext}
                style={{ height: '55px', borderRadius: '15px', backgroundColor: '#52c41a', borderColor: '#52c41a', fontSize: '18px' }}
              >
                {currentIndex === words.length - 1 ? "Finish Learning" : "Next Word"} <ArrowRightOutlined />
              </Button>
            )}
          </div>
        </Space>
      </Card>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Text type="secondary">
          <QuestionCircleOutlined /> 소리를 듣고 빈칸에 들어갈 나머지 철자를 입력하세요.
        </Text>
      </div>
    </div>
  );
};

export default PartialDictationPlayer;