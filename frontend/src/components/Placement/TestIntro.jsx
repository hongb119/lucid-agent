import React from 'react';

const TestIntro = ({ level, total, onStart }) => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* 상단 헤더 영역 */}
        <div style={styles.header}>
          <h1 style={styles.title}>Placement Test</h1>
          <p style={styles.subtitle}>실력 측정을 위한 레벨테스트를 시작합니다.</p>
        </div>

        {/* 정보 표시 영역 */}
        <div style={styles.infoBox}>
          <div style={styles.infoItem}>
            <span style={styles.label}>응시 레벨</span>
            <span style={styles.value}>{level} Course</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>총 문항 수</span>
            <span style={styles.value}>{total || 35} Questions</span>
          </div>
          <div style={styles.infoItem}>
            <span style={styles.label}>소요 시간</span>
            <span style={styles.value}>약 20 ~ 30분</span>
          </div>
        </div>

        {/* 안내 문구 */}
        <div style={styles.guide}>
          <ul style={styles.list}>
            <li>조용한 환경에서 집중하여 응시해 주세요.</li>
            <li>31번 문항부터는 <strong>음성 녹음(Speaking)</strong>이 포함되어 있습니다.</li>
            <li>마이크 권한 허용 메시지가 뜨면 <strong>'허용'</strong>을 눌러주세요.</li>
          </ul>
        </div>

        {/* 시작 버튼 */}
        <button style={styles.startButton} onClick={onStart}>
          시험 시작하기
        </button>
      </div>
    </div>
  );
};

// CSS-in-JS 스타일 (향후 외부 CSS 파일로 분리 가능)
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '70vh',
    fontFamily: "'Pretendard', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    padding: '40px',
    borderRadius: '20px',
    backgroundColor: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  header: {
    marginBottom: '30px',
  },
  title: {
    fontSize: '28px',
    color: '#1a1a1a',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: 0,
  },
  infoBox: {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '12px',
    color: '#888',
    fontWeight: 'bold',
  },
  value: {
    fontSize: '16px',
    color: '#2196F3',
    fontWeight: '700',
  },
  guide: {
    textAlign: 'left',
    marginBottom: '35px',
    padding: '0 10px',
  },
  list: {
    fontSize: '14px',
    color: '#555',
    lineHeight: '1.8',
    paddingLeft: '20px',
  },
  startButton: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2196F3',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default TestIntro;