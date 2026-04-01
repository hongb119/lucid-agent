import React from 'react';

const PatternDrill_FinalResult = ({ reportData, logs, onRetry }) => {
    
    // 부모가 준 값들
    const { fail_count, user_name } = reportData || {};

    // [방어 로직] logs 배열이 있으면 거기서 직접 오답 수를 세는 것이 가장 정확합니다.
    const realFailCount = (logs && logs.length > 0) 
        ? logs.filter(log => log.is_unscramble_correct === false).length 
        : (fail_count || 0);

    const handleClose = () => {
        if (window.opener && typeof window.opener.fnReload === 'function') {
            try { window.opener.fnReload(); } catch (e) {}
        }
        window.close();
    };

    const playAudio = (file) => {
        if (!file) return;
        const audio = new Audio(`https://admin.lucideducation.co.kr/uploadDir/study/mp3/${file}`);
        audio.play().catch(() => {});
    };

    return (
        <div className="educontainer">
            {/* [1] 상단 에이전트 피드백 */}
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {realFailCount > 0 ? (
                                <>
                                    QUIZ 학습을 완료했어요. <br/>
                                    그런데 틀린 QUIZ가 <b>{realFailCount}개</b> 있어요.<br/>
                                    우리 틀린 문장만 한번 더 학습해요!
                                </>
                            ) : (
                                <>
                                    축하합니다! <b>{user_name || '우리'}</b> 학생은 모든 QUIZ를 완벽하게 맞췄어요. <br/>
                                    학습 결과를 확인하고 종료 버튼을 눌러주세요.
                                </>
                            )}
                        </span>
                    </p>
                </div>
            </div>

            {/* [2] 상세 결과 리스트 */}
            <div className="conbox7" style={{ marginTop: '20px' }}>
                <div className="quiz_tx">
                    <p className="qtx1" style={{fontWeight: 'bold', color: '#6f6be6'}}>Detailed Results</p>
                    <div className="qtx2_w">
                        <p className="qtx2"><img src="/static/study/images/icon04.png" alt="" />정답</p>
                        <p className="qtx2"><img src="/static/study/images/icon05.png" alt="" />내 선택</p>
                    </div>
                </div>

                <div className="quiz_re" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '15px' }}>
                    {/* [디버깅 포인트] logs가 정말 있는지 체크 */}
                    {Array.isArray(logs) && logs.length > 0 ? (
                        logs.map((log, idx) => (
                            <div key={idx} className={`re_line ${!log.is_unscramble_correct ? 're_x' : ''}`}>
                                <div className="line1" onClick={() => playAudio(log.study_mp3_file)} style={{ cursor: 'pointer' }}>
                                    <span>{idx + 1}</span>
                                </div>
                                <div className="line2">
                                    <p>{log.question_text || "문장 데이터 없음"}</p>
                                    <p className="box1">
                                        {/* 이미 맞춘 문제는 정답 문장을, 이번에 푼건 입력값을 보여줌 */}
                                        {log.unscramble_input ? log.unscramble_input : (log.is_unscramble_correct ? log.question_text : "(무응답)")}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{padding: '50px', textAlign: 'center', color: '#999'}}>
                            표시할 학습 결과가 없습니다. <br/>
                            <small>(데이터를 불러오는 중입니다...)</small>
                        </div>
                    )}
                </div>
            </div>

            {/* [3] 하단 버튼 */}
            <div className="conbox3" style={{ marginTop: '30px', paddingBottom: '30px' }}>
                <div className="bigbtns" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    {realFailCount > 0 ? (
                        <div className="wid50 w1">
                            <button type="button" className="bigb1 retry_btn" onClick={() => onRetry(true)} style={{ backgroundColor: '#ff5252' }}>
                                <img src="/static/study/images/btn_big1.png" alt="" /> RETRY
                            </button>
                        </div>
                    ) : (
                        <div className="wid50 w1">
                            <button type="button" className="bigb2 finish_btn" onClick={handleClose} style={{ backgroundColor: '#6f6be6' }}>
                                <img src="/static/study/images/btn_big2.png" alt="" /> FINISH
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PatternDrill_FinalResult;