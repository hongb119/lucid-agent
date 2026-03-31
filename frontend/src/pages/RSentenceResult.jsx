import React from 'react';

const RSentenceResult = ({ reportData, onRetry, onExit }) => {
    // reportData가 없을 경우를 대비한 안전 장치
    if (!reportData || !reportData.report) return null;

    const { report, tracking_logs } = reportData;

    // 틀린 문제 개수 계산 (N 판정 개수)
    const incorrectCount = tracking_logs ? tracking_logs.filter(log => log.is_correct === 'N').length : 0;
    
    // 재학습 여부 결정 (틀린게 1개라도 있으면 RETRY 모드)
    const needsRetry = incorrectCount > 0;

    // [기존 로직 보존] 오답 재학습 핸들러
    const handleRetryIncorrect = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const taskId = queryParams.get('task_id');
        const userId = queryParams.get('user_id');
        const currentReStudy = queryParams.get('re_study') || 'N';
        
        // re_study 값 변경 규칙 보존 (N→Y, Y→X 등)
        const newReStudy = currentReStudy === 'N' ? 'Y' : 'X';
        
        window.location.href = `${window.location.pathname}?task_id=${taskId}&user_id=${userId}&re_study=${newReStudy}`;
    };

    return (
        <div className="educontainer">
            <div className="result_page">
                {/* 1. 상단 요약 영역 (디자인 및 문구 완벽 복구) */}
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

                {/* 2. 상세 내역 테이블 (기존 기능 및 스타일 복구) */}
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

                {/* 3. 하단 버튼 영역 (재학습/학습마치기 공존 처리) */}
                <div className="conbox3" style={{ marginTop: '30px' }}>
                    <div className="bigbtns" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        {needsRetry ? (
                            // 틀린게 있을 때: [RETRY(오답만)] 와 [학습 마치기]
                            <>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb1" 
                                        onClick={handleRetryIncorrect}
                                        style={{ width: '100%', height: '60px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer', background: '#007bff', color: '#fff', border: 'none' }}
                                    >
                                        RETRY
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
                            // 다 맞았을 때: [전체 다시하기] 와 [학습 마치기]
                            <>
                                <div className="wid50 w1" style={{ flex: 1 }}>
                                    <button 
                                        type="button" 
                                        className="bigb1" 
                                        onClick={onRetry} 
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