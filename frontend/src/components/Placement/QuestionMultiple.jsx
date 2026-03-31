import React from 'react';

const QuestionMultiple = ({ data, index, total, onNext }) => {
  // 데이터가 없을 경우를 대비한 안전 장치
  if (!data) return null;

  return (
    <div style={styles.container}>
      {/* 상단 진행 상태 */}
      <div style={styles.progressHeader}>
        <span style={styles.badge}>{data.category || 'General'}</span>
        <span style={styles.stepText}>Question {index + 1} of {total}</span>
      </div>

      {/* 문제 텍스트 영역 */}
      <div style={styles.questionBox}>
        <h2 style={styles.questionText}>{data.question_text}</h2>
        {data.sub_text && <p style={styles.subText}>{data.sub_text}</p>}
      </div>

      {/* 오디오 플레이어 (리스닝 문제일 경우 자동 표시) */}
      {data.audio_url && (
        <div style={styles.audioWrapper}>
          <audio src={data.audio_url} controls autoPlay style={styles.audio} />
          <p style={styles.audioHint}>소리를 듣고 정답을 골라주세요.</p>
        </div>
      )}

      {/* 4지선다 보기 버튼 영역 */}
      <div style={styles.optionsGrid}>
        {['a', 'b', 'c', 'd'].map((key) => {
          const optionContent = data[`option_${key}`];
          if (!optionContent) return null; // 보기가 없는 경우 제외

          return (
            <button
              key={key}
              onClick={() => onNext(key)}
              style={styles.optionButton}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = '#2196F3')}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = '#eee')}
            >
              <span style={styles.optionLabel}>{key.toUpperCase()}</span>
              <span style={styles.optionContent}>{optionContent}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '20px',
    animation: 'fadeIn 0.5s ease-in-out',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  badge: {
    backgroundColor: '#E3F2FD',
    color: '#1976D2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  stepText: {
    color: '#888',
    fontSize: '14px',
  },
  questionBox: {
    marginBottom: '40px',
  },
  questionText: {
    fontSize: '24px',
    lineHeight: '1.5',
    color: '#1a1a1a',
    margin: '0 0 15px 0',
  },
  subText: {
    fontSize: '16px',
    color: '#666',
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '8px',
    borderLeft: '4px solid #ddd',
  },
  audioWrapper: {
    marginBottom: '30px',
    textAlign: 'center',
  },
  audio: {
    width: '100%',
  },
  audioHint: {
    fontSize: '13px',
    color: '#999',
    marginTop: '8px',
  },
  optionsGrid: {
    display: 'grid',
    gap: '15px',
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '18px 25px',
    backgroundColor: '#fff',
    border: '2px solid #eee',
    borderRadius: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  optionLabel: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: '20px',
    width: '25px',
  },
  optionContent: {
    fontSize: '17px',
    color: '#333',
  },
};

export default QuestionMultiple;