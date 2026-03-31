import React from 'react';

const PatternDrill_FinalResult = ({ aiSummary, failCount, onRetry }) => {
    
    // [기능] 학습 종료 (부모창 새로고침 후 닫기)
    const handleClose = () => {
        if (window.opener && typeof window.opener.fnReload === 'function') {
            try {
                window.opener.fnReload();
            } catch (e) {
                console.warn("부모창 fnReload 호출 실패:", e);
            }
        }
        window.close();
    };

    return (
        <div className="educontainer">
            {/* [1] 상단 에이전트 피드백 (PHP fail_tcnt 로직 반영) */}
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="에이전트" />
                    </p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {failCount > 0 ? (
                                <>
                                    QUIZ 학습을 완료했어요. <br/>
                                    그런데 틀린 QUIZ가 <b>{failCount}개</b> 있어요.<br/>
                                    우리 틀린 문장만 한번 더 학습해요!
                                </>
                            ) : (
                                <>
                                    축하합니다! 모든 QUIZ를 완벽하게 맞췄어요. <br/>
                                    학습 결과를 확인하고 종료 버튼을 눌러주세요.
                                </>
                            )}
                        </span>
                    </p>
                </div>
            </div>

            {/* [2] AI 루아이의 학습 총평 리포트 */}
            <div className="conbox2" style={{ marginTop: '20px' }}>
                <div className="boxline" style={{ 
                    padding: '25px', 
                    backgroundColor: '#f8f9ff', 
                    borderRadius: '20px', 
                    border: '2px solid #e0e4ff' 
                }}>
                    <p style={{ 
                        fontWeight: 'bold', 
                        color: '#6f6be6', 
                        marginBottom: '15px', 
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '22px' }}>✨</span> AI 루아이의 학습 리포트
                    </p>
                    <div style={{ 
                        fontSize: '16px', 
                        lineHeight: '1.8', 
                        color: '#444', 
                        wordBreak: 'keep-all',
                        whiteSpace: 'pre-wrap' // 줄바꿈 유지
                    }}>
                        {aiSummary || "오늘의 학습 데이터를 정밀 분석하여 총평을 생성 중입니다..."}
                    </div>
                </div>
            </div>

            {/* [3] 하단 버튼 영역 (분기 처리: RETRY vs FINISH) */}
            <div className="conbox3" style={{ marginTop: '40px' }}>
                <div className="bigbtns" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    {failCount > 0 ? (
                        /* 틀린 문항이 있을 때: 다시 풀기(RETRY) */
                        <div className="wid50 w1">
                            <button 
                                type="button" 
                                className="bigb1 retry_btn" 
                                onClick={onRetry}
                                style={{ backgroundColor: '#ff5252' }}
                            >
                                <img src="/static/study/images/btn_big1.png" alt="retry" /> RETRY
                            </button>
                        </div>
                    ) : (
                        /* 모든 문항 정답일 때: 학습 종료(FINISH) */
                        <div className="wid50 w1">
                            <button 
                                type="button" 
                                className="bigb2 finish_btn" 
                                onClick={handleClose}
                                style={{ backgroundColor: '#6f6be6' }}
                            >
                                <img src="/static/study/images/btn_big2.png" alt="finish" /> FINISH
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 스타일 정의 */}
            <style>{`
                .tx_box b { color: #e91e63; font-size: 1.2em; font-weight: 900; }
                .wid50 { width: 260px; }
                .bigb1, .bigb2 { 
                    width: 100%; 
                    height: 75px;
                    cursor: pointer; 
                    border: none; 
                    border-radius: 50px; 
                    font-weight: bold; 
                    font-size: 22px; 
                    color: #fff; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    gap: 12px;
                    transition: all 0.2s ease;
                }
                .bigb1:hover, .bigb2:hover { transform: translateY(-3px); filter: brightness(1.1); }
                .retry_btn { box-shadow: 0 8px 25px rgba(255,82,82,0.3); }
                .finish_btn { box-shadow: 0 8px 25px rgba(111,107,230,0.3); }
                
                @media (max-width: 480px) {
                    .wid50 { width: 90%; }
                    .bigb1, .bigb2 { font-size: 19px; height: 65px; }
                }
            `}</style>
        </div>
    );
};

export default PatternDrill_FinalResult;