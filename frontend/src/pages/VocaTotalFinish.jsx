import React from 'react';

const VocaTotalFinish = ({ reportData, onRetry, onExit }) => {
    // [에러 해결] 데이터 로딩 처리
    if (!reportData) {
        return (
            <div className="educontainer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div className="spinner"></div>
                <p style={{ marginLeft: '15px', fontSize: '18px', color: '#666' }}>학습 리포트를 생성 중입니다...</p>
            </div>
        );
    }

    const { total, correct, ai_comment } = reportData;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return (
        <div className="result_page" style={{ padding: '30px 20px', textAlign: 'center' }}>
            {/* 1. 상단 스코어 카드 (패턴드릴 스타일) */}
            <div className="boxline boxlong_w" style={{ 
                background: '#fff', 
                padding: '40px 20px', 
                borderRadius: '30px', 
                border: '2px solid #007bff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                marginBottom: '30px'
            }}>
                <img src="/static/study/images/img_logo.png" alt="Finish" style={{ maxWidth: '150px', marginBottom: '20px' }} />
                
                <h2 style={{ fontSize: '28px', color: '#333', marginBottom: '10px' }}>Word Learning Report</h2>
                <p style={{ color: '#888', marginBottom: '30px' }}>학습을 성공적으로 마쳤어요!</p>

                {/* 2. 중앙 점수 서클 */}
                <div style={{ 
                    width: '140px', height: '140px', borderRadius: '50%', 
                    border: '8px solid #f0f0f0', borderTopColor: '#007bff',
                    margin: '0 auto 30px', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'center', alignItems: 'center',
                    background: '#f8f9fa'
                }}>
                    <span style={{ fontSize: '14px', color: '#888', fontWeight: 'bold' }}>SCORE</span>
                    <strong style={{ fontSize: '48px', color: '#007bff' }}>{score}</strong>
                </div>

                {/* 3. AI 선생님 코멘트 박스 (스피킹 리포트 스타일) */}
                <div className="ai_box" style={{ 
                    background: '#eef6ff', padding: '25px', borderRadius: '20px', 
                    position: 'relative', marginBottom: '30px', textAlign: 'center'
                }}>
                    <div style={{ 
                        position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                        background: '#007bff', color: '#fff', padding: '3px 15px', 
                        borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' 
                    }}>
                        AI Teacher's Comment
                    </div>
                    <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#2c3e50', fontWeight: '500', margin: '0' }}>
                        "{ai_comment || "오늘 정말 열심히 공부했네요! 다음 학습도 기대할게요!"}"
                    </p>
                </div>

                {/* 4. 통계 그리드 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
                    <div style={{ background: '#f8f9fa', padding: '15px 25px', borderRadius: '15px', minWidth: '100px' }}>
                        <span style={{ display: 'block', color: '#888', fontSize: '14px', marginBottom: '5px' }}>Total</span>
                        <strong style={{ fontSize: '20px', color: '#333' }}>{total}</strong>
                    </div>
                    <div style={{ background: '#e8f5e9', padding: '15px 25px', borderRadius: '15px', minWidth: '100px' }}>
                        <span style={{ display: 'block', color: '#28a745', fontSize: '14px', marginBottom: '5px' }}>Correct</span>
                        <strong style={{ fontSize: '20px', color: '#28a745' }}>{correct}</strong>
                    </div>
                    <div style={{ background: '#ffebee', padding: '15px 25px', borderRadius: '15px', minWidth: '100px' }}>
                        <span style={{ display: 'block', color: '#dc3545', fontSize: '14px', marginBottom: '5px' }}>Wrong</span>
                        <strong style={{ fontSize: '20px', color: '#dc3545' }}>{total - correct}</strong>
                    </div>
                </div>
            </div>

            {/* 5. 하단 버튼 그룹 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                <button 
                    type="button" 
                    onClick={onRetry} 
                    style={{ 
                        width: '180px', height: '55px', borderRadius: '50px', 
                        border: '2px solid #007bff', background: '#fff', color: '#007bff',
                        fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#007bff'; e.target.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.target.style.background = '#fff'; e.target.style.color = '#007bff'; }}
                >
                    다시 학습하기
                </button>
                <button 
                    type="button" 
                    onClick={onExit} 
                    style={{ 
                        width: '180px', height: '55px', borderRadius: '50px', 
                        border: 'none', background: '#007bff', color: '#fff',
                        fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(0,123,255,0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                    onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                >
                    학습 완료
                </button>
            </div>

            <style>{`
                .spinner { width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VocaTotalFinish;