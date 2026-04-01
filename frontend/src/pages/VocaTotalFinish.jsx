import React from 'react';

const VocaTotalFinish = ({ reportData, onRetry, onExit }) => {
    // [방어 로직] 데이터 로딩 처리
    if (!reportData) {
        return (
            <div className="educontainer" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div className="spinner"></div>
                <p style={{ marginLeft: '15px', fontSize: '18px', color: '#666' }}>학습 리포트를 생성 중입니다...</p>
            </div>
        );
    }

    const { ai_comment } = reportData;

    return (
        <div className="result_page" style={{ padding: '40px 20px', textAlign: 'center' }}>
            
            {/* 1. 에이전트 캐릭터와 말풍선 격려 영역 */}
            <div className="boxline" style={{ 
                background: '#fff', 
                padding: '50px 30px', 
                borderRadius: '30px', 
                boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
                marginBottom: '40px',
                border: '1px solid #eef2f6'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <img src="/static/study/images/icon01.png" alt="AI Agent" style={{ width: '80px', marginBottom: '15px' }} />
                    <h2 style={{ fontSize: '24px', color: '#333', fontWeight: 'bold' }}>Word Learning Complete!</h2>
                    <p style={{ color: '#007bff', fontSize: '16px', marginTop: '5px', fontWeight: '500' }}>단어 학습을 모두 마스터했어요!</p>
                </div>

                {/* 2. AI 선생님 코멘트 (강조된 말풍선 스타일) */}
                <div style={{ 
                    background: '#f0f7ff', 
                    padding: '30px', 
                    borderRadius: '25px', 
                    border: '1px solid #d1e3ff',
                    position: 'relative'
                }}>
                    <div style={{ 
                        position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                        background: '#007bff', color: '#fff', padding: '4px 20px', 
                        borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                        boxShadow: '0 4px 10px rgba(0,123,255,0.2)'
                    }}>
                        AI Teacher's Message
                    </div>
                    <p style={{ fontSize: '19px', lineHeight: '1.7', color: '#2c3e50', fontWeight: '600', margin: '0' }}>
                        "{ai_comment || "오늘 배운 단어들을 완벽하게 익혔네요! 정말 대단해요, 다음 학습에서 또 만나요!"}"
                    </p>
                </div>
            </div>

            {/* 3. 하단 액션 버튼 그룹 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <button 
                    type="button" 
                    onClick={onRetry} 
                    style={{ 
                        width: '200px', height: '60px', borderRadius: '50px', 
                        border: '2px solid #007bff', background: '#fff', color: '#007bff',
                        fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#f0f7ff'; }}
                    onMouseLeave={(e) => { e.target.style.background = '#fff'; }}
                >
                    한번 더 학습하기
                </button>
                <button 
                    type="button" 
                    onClick={onExit} 
                    style={{ 
                        width: '200px', height: '60px', borderRadius: '50px', 
                        border: 'none', background: '#007bff', color: '#fff',
                        fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(0,123,255,0.3)',
                        transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => { e.target.style.filter = 'brightness(1.1)'; e.target.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.target.style.filter = 'brightness(1)'; e.target.style.transform = 'translateY(0)'; }}
                >
                    학습 종료
                </button>
            </div>

            <style>{`
                .spinner { width: 35px; height: 35px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VocaTotalFinish;