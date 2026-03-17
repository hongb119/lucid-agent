import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Space, Typography, message } from 'antd';
import { 
  RightOutlined, 
  LeftOutlined, 
  SoundOutlined, 
  CheckCircleOutlined,
  SwapOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const WordPlayer = ({ data, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); // 카드 뒤집기 상태

  // 더미 데이터 (나중에 DB에서 가져온 learning_config를 통해 전달받음)
  const words = data || [
    { word: "Apple", meaning: "사과", phonetic: "[æpl]", image: "🍎" },
    { word: "Elephant", meaning: "코끼리", phonetic: "[éləfənt]", image: "🐘" },
    { word: "Grapes", meaning: "포도", phonetic: "[ɡreɪps]", image: "🍇" },
    { word: "Computer", meaning: "컴퓨터", phonetic: "[kəmpjúːtər]", image: "💻" },
    { word: "Rocket", meaning: "로켓", phonetic: "[rάkit]", image: "🚀" },
  ];

  const currentWord = words[currentIndex];

  // --- 🔊 음성 출력 함수 (TTS) ---
  const speak = (text) => {
    // 이전 음성 진행 중이면 취소
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; 
    utterance.rate = 0.8; // 아이들이 듣기 좋은 속도
    window.speechSynthesis.speak(utterance);
  };

  // 단어가 바뀔 때마다 자동으로 읽어주기
  useEffect(() => {
    speak(currentWord.word);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      if (onFinish) onFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      {/* 1. 상단 학습 진행도 */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text strong style={{ color: '#faad14' }}>Word Study Step 1</Text>
          <Text type="secondary">{currentIndex + 1} / {words.length}</Text>
        </div>
        <Progress 
          percent={Math.round(((currentIndex + 1) / words.length) * 100)} 
          status="active" 
          strokeColor="#faad14" 
          showInfo={false}
        />
      </div>

      {/* 2. 메인 단어 카드 (애니메이션 구역) */}
      <div 
        onClick={() => {
          setIsFlipped(!isFlipped);
          if (!isFlipped) speak(currentWord.word); // 뒤집을 때 다시 읽어주기
        }}
        style={{
          height: 380,
          perspective: '1000px',
          cursor: 'pointer',
          marginBottom: 40
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          textAlign: 'center',
          transition: 'transform 0.6s',
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>
          {/* [앞면] 영어 단어와 이미지 */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#fff', borderRadius: '30px', border: '3px solid #faad14',
            boxShadow: '0 15px 35px rgba(250, 173, 20, 0.15)'
          }}>
            <div style={{ fontSize: '100px', marginBottom: 10 }}>{currentWord.image}</div>
            <Title level={1} style={{ color: '#003366', margin: '10px 0', fontSize: '48px' }}>
              {currentWord.word}
            </Title>
            <Text type="secondary" style={{ fontSize: '18px' }}>{currentWord.phonetic}</Text>
            
            <Button 
              type="primary" 
              shape="circle" 
              size="large"
              icon={<SoundOutlined />} 
              style={{ marginTop: 25, backgroundColor: '#faad14', border: 'none' }}
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 겹치지 않게 방지
                speak(currentWord.word);
              }}
            />
            <div style={{ marginTop: 20, color: '#bfbfbf', fontSize: '13px' }}>
              <SwapOutlined /> 카드를 터치해서 뜻을 확인해요!
            </div>
          </div>

          {/* [뒷면] 한글 뜻 */}
          <div style={{
            position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            backgroundColor: '#fffbe6', borderRadius: '30px', border: '3px solid #faad14',
            transform: 'rotateY(180deg)',
            boxShadow: '0 15px 35px rgba(250, 173, 20, 0.15)'
          }}>
            <Text style={{ fontSize: '20px', color: '#d48806' }}>뜻 (Meaning)</Text>
            <Title level={1} style={{ color: '#d48806', margin: '20px 0', fontSize: '56px' }}>
              {currentWord.meaning}
            </Title>
            <div style={{ marginTop: 30, color: '#bfbfbf', fontSize: '13px' }}>
              다시 터치하면 영어 단어가 보여요!
            </div>
          </div>
        </div>
      </div>

      {/* 3. 하단 컨트롤 버튼 */}
      <div style={{ textAlign: 'center' }}>
        <Space size={30}>
          <Button 
            size="large" 
            shape="round" 
            icon={<LeftOutlined />} 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            style={{ width: 120, height: 50 }}
          >
            PREV
          </Button>
          
          <Button 
            size="large" 
            type="primary" 
            shape="round" 
            onClick={handleNext}
            style={{ 
              width: 180, height: 50, 
              backgroundColor: currentIndex === words.length - 1 ? '#52c41a' : '#1890ff',
              borderColor: currentIndex === words.length - 1 ? '#52c41a' : '#1890ff',
              fontWeight: 'bold', fontSize: '18px'
            }}
          >
            {currentIndex === words.length - 1 ? (
              <span><CheckCircleFilled /> FINISH</span>
            ) : (
              <span>NEXT <RightOutlined /></span>
            )}
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default WordPlayer;