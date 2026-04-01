import React from 'react';

const RSentenceResult = ({ reportData, onRetry, onExit }) => {
    if (!reportData || !reportData.report) return null;

    const { report, tracking_logs } = reportData;

    // 1. 틀린 문제(N) 판정된 로그들만 골라냅니다.
    const incorrectLogs = tracking_logs ? tracking_logs.filter(log => log.is_correct === 'N') : [];
    const incorrectCount = incorrectLogs.length;
    const needsRetry = incorrectCount > 0;

    // 🚩 [수정] 오답 재학습 핸들러: 새로고침 없이 부모 상태 업데이트
    const handleRetryIncorrect = () => {
        // 틀린 문항의 study_item_no 리스트를 추출합니다.
        const incorrectIds = incorrectLogs.map(log => Number(log.study_item_no));
        
        // 부모(RSentenceMain)의 handleRetryIncorrect 함수를 호출합니다.
        if (onRetry) {
            onRetry(incorrectIds);
        }
    };

    return (
        <div className="educontainer">
            <div className="result_page">
                {/* 상단 요약 영역 */}
                <div className="res_top">
                    <p className="t1">QUIZ 학습을 완료 했어요.</p>
                    <div className="score_box">
                        <p style={{marginBottom: '5px'}}>정답 : <span className="txt_blue" style={{fontWeight:'bold'}}>{report.correct_items}</span> / {report.total_items}</p>
                        {needsRetry && (
                            <p style={{marginBottom: '5px'}}>틀린 QUIZ가 <span style={{color: '#e74c3c', fontWeight: 'bold'}}>{incorrectCount}</span>개 있어요.</p>
                        )}
                        <p>소요시간 : <span>{Math.floor(report.total_time / 60)}분 {report.total_time % 60}초</span></p>
                    </div>
                    
                    <p className="comment" style={{marginTop: '15px', fontSize: '18px'}}>
                        {needsRetry 
                            ? "우리 틀린 문장만 한번 더 학습 해요!" 
                            : (report.ai_comment || "정말 잘했어요! 완벽합니다.")
                        }
                    </p>
                </div>

                {/* 상세 내역 테이블 */}
                <div className="res_content" style={{ marginTop: '25px', maxHeight: '350px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '10px' }}>
                    <table className="res_table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fcfcfc', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #efefef' }}>
                                <th style={{ padding: '12px', width: '60px' }}>No</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>정답 문장 / 나의 입력</th>
                                <th style={{ padding: '12px', width: '80px' }}>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tracking_logs && tracking_logs.map((log, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ textAlign: 'center', padding: '15px', color: '#999' }}>{idx + 1}</td>
                                    <td style={{ padding: '15px' }}>
                                        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 5px 0' }}>{log.origin_eng}</p>
                                        <p style={{ 
                                            color: log.is_correct === 'Y' ? '#2ecc71' : '#e74c3c', 
                                            fontWeight: '600', 
                                            margin: 0,
                                            fontSize: '16px'
                                        }}>
                                            {log.input_text || "(No Input)"}
                                        </p>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '15px' }}>
                                        <span style={{ 
                                            fontSize: '20px', 
                                            fontWeight: 'bold',
                                            color: log.is_correct === 'Y' ? '#3498db' : '#e74c3c' 
                                        }}>
                                            {log.is_correct === 'Y' ? '○' : '×'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 하단 버튼 영역 */}
                <div className="conbox3" style={{ marginTop: '30px' }}>
                    <div className="bigbtns" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        {needsRetry ? (
                            <>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb1" 
                                        onClick={handleRetryIncorrect} // 💡 수정된 오답 리트라이 핸들러
                                        style={{ width: '100%', height: '60px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none' }}
                                    >
                                        틀린것만 RETRY
                                    </button>
                                </div>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb2" 
                                        onClick={onExit}
                                        style={{ width: '100%', height: '60px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', background: '#6F6BE6', color: '#fff', border: 'none' }}
                                    >
                                        학습 마치기
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb1" 
                                        onClick={() => onRetry()} // 전체 다시하기
                                        style={{ width: '100%', height: '60px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', background: '#fff', color: '#333', border: '2px solid #ddd' }}
                                    >
                                        다시하기
                                    </button>
                                </div>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb2" 
                                        onClick={onExit}
                                        style={{ width: '100%', height: '60px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', background: '#6F6BE6', color: '#fff', border: 'none' }}
                                    >
                                        학습 마치기
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RSentenceResult;