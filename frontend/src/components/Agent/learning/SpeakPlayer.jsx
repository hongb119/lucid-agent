import React, { useState, useRef } from 'react';
import { Card, Button, Progress, Space, Typography, message, Empty } from 'antd';
import { 
  AudioOutlined, 
  PlayCircleOutlined, 
  SoundOutlined, 
  CheckCircleFilled,
  ReloadOutlined,
  StopOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const SpeakPlayer = ({ data, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const sentences = data || [
    { text: "Nice to meet you.", meaning: "만나서 반가워요.", image: "🤝" },
    { text: "What is your name?", meaning: "이름이 뭐예요?", image: "❓" },
    { text: "I like English.", meaning: "나는 영어가 좋아요.", image: "❤️" },
  ];

  const current = sentences[currentIndex];

  // 🔊 원어민 소리 듣기 (TTS)
  const playNative = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // 🎙️ 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioUrl(URL.createObjectURL(audioBlob));
        setIsRecording(false);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setAudioUrl(null);
    } catch (err) {
      message.error("마이크 권한이 필요합니다.");
    }
  };

  // ⏹️ 녹음 중지
  const stopRecording = () => {
    if (mediaRecorder.current) mediaRecorder.current.stop();
  };

  // 🎧 내 목소리 다시 듣기
  const playMyVoice = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const nextStep = () => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAudioUrl(null);
    } else {
      onFinish();
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 30 }}>
        <Text strong style={{ color: '#ff4d4f' }}>Speaking Training Step 3</Text>
        <Progress percent={Math.round(((currentIndex + 1) / sentences.length) * 100)} strokeColor="#ff4d4f" />
      </div>

      <Card variant="borderless" style={{ borderRadius: '30px', boxShadow: '0 10px 40px rgba(255, 77, 79, 0.1)', textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '60px', marginBottom: 10 }}>{current.image}</div>
        <Title level={2} style={{ color: '#333' }}>{current.text}</Title>
        <Title level={4} style={{ color: '#8c8c8c', marginTop: 0 }}>{current.meaning}</Title>

        <div style={{ margin: '40px 0', padding: '30px', background: '#fff1f0', borderRadius: '20px' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 1. 원어민 소리 듣기 */}
            <Button size="large" icon={<SoundOutlined />} onClick={playNative} block style={{ borderRadius: '15px', height: '50px' }}>
              Listen to Native (원어민 듣기)
            </Button>

            {/* 2. 녹음하기 버튼 */}
            {!isRecording ? (
              <Button 
                type="primary" danger size="large" icon={<AudioOutlined />} block 
                style={{ borderRadius: '15px', height: '60px', fontSize: '18px', fontWeight: 'bold' }}
                onClick={startRecording}
              >
                {audioUrl ? "Record Again (다시 녹음)" : "Start Recording (녹음 시작)"}
              </Button>
            ) : (
              <Button 
                type="primary" danger size="large" icon={<StopOutlined />} block pulse="true"
                style={{ borderRadius: '15px', height: '60px', animation: 'pulse 1s infinite' }}
                onClick={stopRecording}
              >
                Recording... (중지하려면 클릭)
              </Button>
            )}

            {/* 3. 내 목소리 확인 */}
            {audioUrl && (
              <Button size="large" icon={<PlayCircleOutlined />} onClick={playMyVoice} block style={{ borderColor: '#ff4d4f', color: '#ff4d4f', borderRadius: '15px', height: '50px' }}>
                Listen to Me (내 목소리 듣기)
              </Button>
            )}
          </Space>
        </div>

        <Button 
          type="primary" size="large" shape="round" icon={<CheckCircleFilled />} 
          disabled={!audioUrl}
          onClick={nextStep}
          style={{ width: '200px', height: '50px', backgroundColor: audioUrl ? '#ff4d4f' : '#d9d9d9' }}
        >
          {currentIndex === sentences.length - 1 ? "Finish Training" : "Next Sentence"}
        </Button>
      </Card>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SpeakPlayer;