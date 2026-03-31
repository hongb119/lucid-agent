import React, { useMemo } from 'react';

const TestReport = ({ level, answers, questions }) => {
  // 1. 결과 데이터 분석 (점수 및 영역별 성취도 계산)
  const reportData = useMemo(() => {
    let totalScore = 0;
    const categories = {
      Listening: { correct: 0, total: 0 },
      Reading: { correct: 0, total: 0 },
      Speaking: { attempted: 0, total: 0 } // 스피킹은 자동채점이 아니므로 응시 여부만 체크
    };

    questions.forEach(q => {
      const category = q.category || 'Reading';
      const userAnswer = answers[q.q_number];
      const isCorrect = userAnswer === q.correct_answer;

      if (category === 'Speaking') {
        categories.Speaking.total++;
        if (userAnswer) categories.Speaking.attempted++;
      } else {
        if (!categories[category]) categories[category] = { correct: 0, total: 0 };
        categories[category].total++;
        if (isCorrect) {
          categories[category].correct++;
          totalScore += (q.points || 2); // 문제당 배점 (기본 2점)
        }
      }
    });

    return { totalScore, categories };
  }, [answers, questions]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Test Result</h1>
        <p style={styles.subtitle}>{level} Course과정을 완료하셨습니다.</p>

        {/* 총점 섹션 */}
        <div style={styles.scoreCircle}>
          <span style={styles.scoreLabel}>Score</span>
          <span style={styles.scoreValue}>{reportData.totalScore}</span>
        </div>

        <hr style={styles.divider} />

        {/* 영역별 성취도 차트/바 */}
        <div style={styles.categorySection}>
          <h3 style={styles.sectionTitle}>영역별 분석</h3>
          {Object.entries(reportData.categories).map(([key, val]) => (
            <div key={key} style={styles.categoryRow}>
              <div style={styles.categoryInfo}>
                <span style={styles.categoryName}>{key}</span>
                <span style={styles.categoryCount}>
                  {key === 'Speaking' 
                    ? `${val.attempted} / ${val.total} 녹음완료` 
                    : `${val.correct} / ${val.total} 정답`}
                </span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBarFill,
                  width: `${key === 'Speaking' ? (val.attempted/val.total)*100 : (val.correct/val.total)*100}%`,
                  backgroundColor: key === 'Listening' ? '#4CAF50' : key === 'Speaking' ? '#FF9800' : '#2196F3'
                }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* 하단 버튼 제어 */}
        <div style={styles.footer}>
          <p style={styles.notice}>상세 분석 결과는 담당 선생님께 전달되었습니다.</p>
          <button style={styles.closeButton} onClick={() => window.close()}>
            시험 종료 및 창 닫기
          </button>
        </div>
      </div>
    </div>
  );
};

// 스타일 정의
const styles = {
  container: { padding: '40px 20px', display: 'flex', justifyContent: 'center', backgroundColor: '#f5f7f9', minHeight: '90vh' },
  card: { width: '100%', maxWidth: '600px', backgroundColor: '#fff', borderRadius: '24px', padding: '40px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' },
  title: { fontSize: '32px', color: '#1a1a1a', margin: '0 0 10px 0' },
  subtitle: { fontSize: '16px', color: '#666', marginBottom: '40px' },
  scoreCircle: { width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#2196F3', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', margin: '0 auto 40px' },
  scoreLabel: { fontSize: '14px', opacity: 0.8 },
  scoreValue: { fontSize: '48px', fontWeight: 'bold' },
  divider: { border: 'none', borderTop: '1px solid #eee', margin: '30px 0' },
  categorySection: { textAlign: 'left', marginBottom: '40px' },
  sectionTitle: { fontSize: '18px', color: '#333', marginBottom: '20px' },
  categoryRow: { marginBottom: '20px' },
  categoryInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  categoryName: { fontWeight: '600', color: '#444' },
  categoryCount: { fontSize: '13px', color: '#888' },
  progressBarBg: { height: '10px', backgroundColor: '#eee', borderRadius: '5px', overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: '5px', transition: 'width 1s ease-in-out' },
  footer: { marginTop: '20px' },
  notice: { fontSize: '14px', color: '#999', marginBottom: '20px' },
  closeButton: { width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: '#333', color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }
};

export default TestReport;