import React from 'react';

const PatternDrillReport = ({ reportData, logs, onRetry }) => {
    // reportData: 백엔드에서 받은 {fail_count, pass_count, summary}
    const { fail_count, total_count, summary } = reportData;

    return (
        <div className="educontainer">
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {fail_count > 0 ? (
                                <>
                                    QUIZ 학습을 완료했어요. 그런데 틀린 QUIZ가 <b>{fail_count}개</b> 있어요.<br/>
                                    우리 틀린 문장만 한번 더 학습해요!
                                </>
                            ) : (
                                <>모든 QUIZ를 맞췄어요! 완벽합니다. 👍</>
                            )}
                            <br/><br/>
                            <small style={{color: '#666'}}>{summary}</small>
                        </span>
                    </p>
                </div>
            </div>

            {/* 상세 오답 리스트 (사용자 요청 사항) */}
            <div className="report_list" style={{margin: '20px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '10px'}}>
                {logs.map((log, idx) => (
                    <div key={idx} style={{padding: '10px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', backgroundColor: log.is_unscramble_correct ? '#fff' : '#fff0f0'}}>
                        <div style={{textAlign: 'left'}}>
                            <p style={{fontSize: '14px', fontWeight: 'bold', color: log.is_unscramble_correct ? '#28a745' : '#e91e63'}}>
                                {log.is_unscramble_correct ? '● Correct' : '× Wrong'}
                            </p>
                            <p style={{fontSize: '13px'}}>{log.question_text}</p>
                            {!log.is_unscramble_correct && (
                                <p style={{fontSize: '12px', color: '#666'}}>My: {log.unscramble_input}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="conbox3">
                <div className="bigbtns">
                    <div className="wid50 w1">
                        <button type="button" className="bigb1" onClick={() => onRetry(fail_count > 0)}>
                            <img src="/static/study/images/btn_big1.png" alt="" /> 
                            {fail_count > 0 ? "RETRY" : "FINISH"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatternDrillReport;