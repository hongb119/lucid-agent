import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Progress, Input, Typography, Space, message, Result } from 'antd';
import { 
  SoundOutlined, 
  CheckOutlined, 
  ArrowRightOutlined, 
  BulbOutlined,
  EditOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const DictationPlayer = ({ data, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState(null); // null, true, false
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef(null);

  const words = data || [
    { word: "Apple", meaning: "사과", hint: "A _ _ l e", image: "🍎" },
    { word: "Elephant", meaning: "코끼리", hint: "E _ _ _ h a n t", image: "🐘" },
    { word: "Computer", meaning: "컴퓨터", hint: "C o m _ _ t e r", image: "💻" },
  ];

  const current = words[currentIndex];

  // 🔊 음성 출력 (TTS)
  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // 문제 바뀔 때마다 소리 재생 및 포커스
  useEffect(() => {
    speak();
    setUserInput('');
    setIsCorrect(null);
    setShowHint(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [currentIndex]);

  // 정답 체크
  const checkAnswer = () => {
    if (!userInput.trim()) {
      message.warning("답을 입력해 주세요!");
      return;
    }

    if (userInput.toLowerCase().trim() === current.word.toLowerCase()) {
      setIsCorrect(true);
      message.success("Perfect! 정확한 스펠링이에요.");
    } else {
      setIsCorrect(false);
      message.error("다시 한번 잘 들어보세요.");
    }
  };

  const nextStep = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 30 }}>
        <Text strong style={{ color: '#722ed1' }}>Dictation Step 5</Text>
        <Progress percent={Math.round(((currentIndex + 1) / words.length) * 100)} strokeColor="#722ed1" />
      </div>

      <Card 
        variant="borderless" 
        style={{ borderRadius: '30px', boxShadow: '0 15px 40px rgba(114, 46, 209, 0.1)', textAlign: 'center' }}
      >
        <div style={{ fontSize: '50px', marginBottom: 10 }}>{current.image}</div>
        <Title level={3} style={{ color: '#595959' }}>소리를 듣고 단어를 쓰세요</Title>
        <Text type="secondary">{current.meaning}</Text>

        <div style={{ margin: '30px 0' }}>
          <Button 
            type="primary" 
            shape="circle" 
            size="large" 
            icon={<SoundOutlined />} 
            onClick={speak}
            style={{ width: 80, height: 80, fontSize: '30px', backgroundColor: '#722ed1', border: 'none' }}
          />
        </div>

        <div style={{ padding: '0 40px' }}>
          <Input 
            ref={inputRef}
            placeholder="Type the word here..." 
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onPressEnter={isCorrect ? nextStep : checkAnswer}
            disabled={isCorrect}
            style={{ 
              height: '60px', 
              fontSize: '24px', 
              textAlign: 'center', 
              borderRadius: '15px',
              border: isCorrect ? '2px solid #52c41a' : (isCorrect === false ? '2px solid #ff4d4f' : '2px solid #d9d9d9')
            }}
          />
          
          {showHint && (
            <div style={{ marginTop: 15, color: '#722ed1', fontWeight: 'bold', fontSize: '18px', letterSpacing: '4px' }}>
              {current.hint}
            </div>
          )}
        </div>

        <div style={{ marginTop: 30 }}>
          <Space size="middle">
            {!isCorrect ? (
              <>
                <Button icon={<BulbOutlined />} onClick={() => setShowHint(true)}>힌트 보기</Button>
                <Button type="primary" onClick={checkAnswer} style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}>
                  정답 확인
                </Button>
              </>
            ) : (
              <Button type="primary" onClick={nextStep} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
                다음 문제 <ArrowRightOutlined />
              </Button>
            )}
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default DictationPlayer;