import React from 'react';

const RSentenceResult = ({ reportData, onRetry, onExit }) => {
    const { report, tracking_logs } = reportData;

    return (
        <div className="educontainer">
            <div className="result_page">
                {/* 1. 상단 요약 영역 */}
                <div className="res_top">
                    <p className="t1">학습이 완료되었습니다!</p>
                    <div className="score_box">
                        <p>정답 : <span>{report.correct_items}</span> / {report.total_items}</p>
                        <p>소요시간 : <span>{Math.floor(report.total_time / 60)}분 {report.total_time % 60}초</span></p>
                    </div>
                    <p className="comment">"{report.ai_comment}"</p>
                </div>

                {/* 2. 상세 내역 영역 (content.css의 표 디자인 활용) */}
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

                {/* 3. 하단 버튼 영역 */}
                <div className="res_btns" style={{ marginTop: '30px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <button className="btn_retry" onClick={onRetry} style={{ padding: '10px 30px', cursor: 'pointer' }}>다시하기</button>
                    <button className="btn_exit" onClick={onExit} style={{ padding: '10px 30px', cursor: 'pointer', background: '#6F6BE6', color: '#fff', border: 'none' }}>나가기</button>
                </div>
            </div>
        </div>
    );
};

export default RSentenceResult;