import React, { useState, useRef } from 'react';

const QuestionSpeaking = ({ data, index, total, onNext }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 1. 녹음 시작 함수
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // 부모 컴포넌트(PlacementMain)에 Blob 데이터를 전달하여 다음으로 이동
        // 실제로는 여기서 서버 업로드 로직이 추가될 수 있습니다.
        onNext(audioBlob); 
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("마이크 권한이 거부되었거나 마이크를 찾을 수 없습니다.");
      console.error(err);
    }
  };

  // 2. 녹음 중지 함수
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!data) return null;

  return (
    <div style={styles.container}>
      {/* 상단 헤더 */}
      <div style={styles.header}>
        <span style={styles.badge}>Speaking & Reading</span>
        <span style={styles.step}>Question {index + 1} of {total}</span>
      </div>

      {/* 지문 영역 */}
      <div style={styles.contentBox}>
        <h2 style={styles.instruction}>아래 문장을 큰 소리로 따라 읽어주세요.</h2>
        <div style={styles.textPaper}>
          <p style={styles.questionText}>{data.question_text}</p>
          {data.sub_text && <p style={styles.subText}>{data.sub_text}</p>}
        </div>
      </div>

      {/* 녹음 컨트롤러 영역 */}
      <div style={styles.recorderSection}>
        <div style={isRecording ? styles.pulseContainer : styles.staticContainer}>
           {isRecording && <div style={styles.pulseRing}></div>}
           <button 
             onClick={isRecording ? stopRecording : startRecording} 
             style={{...styles.micButton, backgroundColor: isRecording ? '#ff4b4b' : '#2196F3'}}
           >
             {isRecording ? '⏹️' : '🎤'}
           </button>
        </div>
        
        <p style={styles.statusText}>
          {isRecording 
            ? "녹음 중입니다... 다 읽으셨다면 버튼을 다시 눌러주세요." 
            : "마이크 버튼을 누르고 읽기를 시작하세요."}
        </p>
      </div>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: { maxWidth: '700px', margin: '0 auto', padding: '20px', textAlign: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '40px' },
  badge: { backgroundColor: '#FFF3E0', color: '#E65100', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' },
  step: { color: '#888', fontSize: '14px' },
  instruction: { fontSize: '18px', color: '#666', marginBottom: '20px' },
  textPaper: { backgroundColor: '#fff', border: '1px solid #eee', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '40px' },
  questionText: { fontSize: '26px', fontWeight: '700', color: '#333', lineHeight: '1.6', margin: 0 },
  subText: { marginTop: '15px', color: '#888', fontStyle: 'italic' },
  recorderSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  pulseContainer: { position: 'relative', width: '100px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  staticContainer: { width: '100px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  micButton: { width: '80px', height: '80px', borderRadius: '50%', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer', zIndex: 2, transition: 'all 0.3s' },
  statusText: { fontSize: '15px', color: '#666', fontWeight: '500' },
  // 녹음 중일 때 퍼지는 원형 애니메이션 (CSS-in-JS로 간단히 구현)
  pulseRing: {
    position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#ff4b4b', opacity: 0.5,
    animation: 'pulse 1.5s infinite ease-out',
  }
};

export default QuestionSpeaking;