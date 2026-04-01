import React from 'react';

const PatternDrill_SpeakingReport = ({ logs, stats, onNext }) => {
    // 성적에 따른 격려 멘트 생성 로직
    const getAiFeedback = () => {
        const total = (stats.correct || 0) + (stats.wrong || 0);
        const ratio = total > 0 ? stats.correct / total : 0;

        if (ratio === 1) return "와우! 모든 문장을 완벽하게 읽어냈어요! 오늘 학습하느라 정말 고생 많았어요. 👍";
        if (ratio >= 0.7) return "훌륭해요! 발음이 아주 좋아요. 조금만 더 자신 있게 말하면 원어민 같을 거예요!";
        return "포기하지 마세요! 루아이가 들려주는 소리를 다시 듣고 따라 하면 금방 좋아질 거예요. 힘내세요! 🔥";
    };

    return (
        <div className="result_page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="boxline" style={{ background: '#fff', padding: '30px', borderRadius: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                
                {/* [1] 에이전트 격려 영역 (말풍선 스타일) */}
                <div className="speech" style={{ marginBottom: '30px', display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                    <img src="/static/study/images/icon01.png" alt="AI" style={{ width: '50px', height: '50px' }} />
                    <div style={{ 
                        background: '#f0f4ff', 
                        padding: '15px 20px', 
                        borderRadius: '0 20px 20px 20px',
                        border: '1px solid #d1d9ff',
                        position: 'relative',
                        flex: 1
                    }}>
                        <p style={{ margin: 0, fontSize: '15px', color: '#444', lineHeight: '1.6', fontWeight: '500' }}>
                            {getAiFeedback()}
                        </p>
                    </div>
                </div>

                <h2 style={{ fontSize: '18px', color: '#333', marginBottom: '20px', textAlign: 'left', fontWeight: 'bold', paddingLeft: '10px' }}>
                    Speaking Analysis Details
                </h2>
                
                {/* [2] 상세 분석 내역 (통계 섹션 삭제 후 바로 노출) */}
                <div style={{ maxHeight: '400px', overflowY: 'auto', background: '#fbfcfd', padding: '20px', borderRadius: '20px', border: '1px solid #eee' }}>
                    {logs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', background: '#eee', padding: '2px 8px', borderRadius: '4px', color: '#666' }}>Q{idx + 1}</span>
                                {log.is_speaking_correct ? 
                                    <span style={{ fontSize: '11px', color: '#52c41a', fontWeight: 'bold' }}>● 정밀 일치</span> : 
                                    <span style={{ fontSize: '11px', color: '#faad14', fontWeight: 'bold' }}>● 발음 확인 필요</span>
                                }
                            </div>
                            
                            {/* 정답 문장 */}
                            <p style={{ fontSize: '15px', color: '#333', margin: '5px 0', fontWeight: '500' }}>
                                <span style={{ color: '#aaa', marginRight: '5px' }}>Target:</span> {log.question_text}
                            </p>
                            
                            {/* 학생이 말한 내용 */}
                            <p style={{ 
                                fontSize: '14px', 
                                color: log.is_speaking_correct ? '#52c41a' : '#faad14', 
                                margin: '3px 0',
                                paddingLeft: '10px',
                                borderLeft: `3px solid ${log.is_speaking_correct ? '#52c41a' : '#faad14'}`,
                                fontStyle: 'italic'
                            }}>
                                <span style={{ color: '#999', fontSize: '12px', marginRight: '5px', fontStyle: 'normal' }}>You said:</span>
                                "{log.student_transcript || "소리가 들리지 않았어요"}"
                            </p>
                        </div>
                    ))}
                </div>

                {/* [3] 하단 전환 버튼 */}
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button 
                        className="bigb2" 
                        style={{ 
                            width: '100%', 
                            padding: '18px', 
                            borderRadius: '50px', 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '10px',
                            backgroundColor: '#6f6be6',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer'
                        }} 
                        onClick={onNext}
                    >
                        <img src="/static/study/images/btn_big2.png" alt="" style={{ width: '25px' }} />
                        다음 단계: 문장 완성하기 (Unscramble)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatternDrill_SpeakingReport;