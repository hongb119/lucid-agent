import React from 'react';

const RSentenceResult = ({ reportData, onRetry, onExit }) => {
    const { report, tracking_logs } = reportData;

    // 틀린 문제 개수 계산
    const incorrectCount = tracking_logs.filter(log => log.is_correct === 'N').length;
    const totalCount = tracking_logs.length;
    
    // 재학습 여부 결정
    const needsRetry = incorrectCount > 0;

    // 재학습 핸들러
    const handleRetryIncorrect = () => {
        // URL 파라미터에서 현재 값 가져오기
        const queryParams = new URLSearchParams(window.location.search);
        const taskId = queryParams.get('task_id');
        const userId = queryParams.get('user_id');
        const currentReStudy = queryParams.get('re_study') || 'N';
        
        // re_study 값 변경: N→Y, R→X
        const newReStudy = currentReStudy === 'N' ? 'Y' : 'X';
        
        // 재학습을 위해 페이지 새로고침 (재학습 파라미터와 함께)
        window.location.href = `${window.location.pathname}?task_id=${taskId}&user_id=${userId}&re_study=${newReStudy}`;
    };

    return (
        <div className="educontainer">
            <div className="result_page">
                {/* 1. 상단 요약 영역 */}
                <div className="res_top">
                    <p className="t1">QUIZ 학습을 완료 했어요.</p>
                    {needsRetry ? (
                        <>
                            <div className="score_box">
                                <p>정답 : <span>{report.correct_items}</span> / {report.total_items}</p>
                                <p>틀린 QUIZ가 <span style={{color: '#e74c3c', fontWeight: 'bold'}}>{incorrectCount}</span>개 있어요.</p>
                                <p>소요시간 : <span>{Math.floor(report.total_time / 60)}분 {report.total_time % 60}초</span></p>
                            </div>
                            <p className="comment">우리 틀린 단어만 한번 더 학습 해요.</p>
                        </>
                    ) : (
                        <>
                            <div className="score_box">
                                <p>정답 : <span>{report.correct_items}</span> / {report.total_items}</p>
                                <p>소요시간 : <span>{Math.floor(report.total_time / 60)}분 {report.total_time % 60}초</span></p>
                            </div>
                            <p className="comment">"{report.ai_comment}"</p>
                        </>
                    )}
                </div>

                {/* 2. 상세 내역 영역 */}
                <div className="res_content" style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="res_table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                                <th style={{ padding: '10px' }}>No</th>
                                <th style={{ padding: '10px' }}>정답 문장 / 나의 입력</th>
                                <th style={{ padding: '10px' }}>판정</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tracking_logs.map((log, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ textAlign: 'center', padding: '10px' }}>{log.study_item_no}</td>
                                    <td style={{ padding: '10px' }}>
                                        <p style={{ color: '#666', fontSize: '13px', margin: 0 }}>{log.origin_eng}</p>
                                        <p style={{ color: log.is_correct === 'Y' ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', margin: 0 }}>
                                            {log.input_text}
                                        </p>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '10px' }}>
                                        <span className={log.is_correct === 'Y' ? 'txt_blue' : 'txt_red'}>
                                            {log.is_correct === 'Y' ? '○' : '×'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 3. 하단 버튼 영역 - PHP 원본과 동일한 구조 */}
                <div className="conbox3" style={{ marginTop: '30px' }}>
                    <div className="bigbtns">
                        {needsRetry ? (
                            <div className="wid50 w1">
                                <button 
                                    type="button" 
                                    className="bigb1" 
                                    onClick={handleRetryIncorrect}
                                    style={{
                                        padding: '15px 30px',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        border: 'none',
                                        borderRadius: '5px',
                                        backgroundColor: '#007bff',
                                        color: '#fff'
                                    }}
                                >
                                    RETRY
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="wid50 w1" style={{ marginRight: '10px' }}>
                                    <button 
                                        className="btn_retry" 
                                        onClick={onRetry} 
                                        style={{ 
                                            padding: '10px 30px', 
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                    >
                                        다시하기
                                    </button>
                                </div>
                                <div className="wid50 w1">
                                    <button 
                                        className="btn_exit" 
                                        onClick={onExit} 
                                        style={{ 
                                            padding: '10px 30px', 
                                            cursor: 'pointer', 
                                            background: '#6F6BE6', 
                                            color: '#fff', 
                                            border: 'none',
                                            fontSize: '14px'
                                        }}
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