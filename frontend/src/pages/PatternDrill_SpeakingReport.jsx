import React from 'react';

const PatternDrill_SpeakingReport = ({ logs, stats, onNext }) => {
    return (
        <div className="result_page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <div className="boxline" style={{ background: '#fff', padding: '30px', borderRadius: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <h2 style={{ fontSize: '24px', color: '#333', marginBottom: '20px', textAlign: 'center' }}>Speaking Analysis Report</h2>
                
                {/* 상단 요약 통계 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '25px' }}>
                    <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '15px', flex: 1, textAlign: 'center' }}>
                        <p style={{ color: '#2196f3', fontSize: '14px', marginBottom: '5px' }}>Excellent</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.correct}</p>
                    </div>
                    <div style={{ background: '#ffebee', padding: '15px', borderRadius: '15px', flex: 1, textAlign: 'center' }}>
                        <p style={{ color: '#f44336', fontSize: '14px', marginBottom: '5px' }}>Check</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.wrong}</p>
                    </div>
                </div>

                {/* 상세 내역 */}
                <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8f9fa', padding: '15px', borderRadius: '15px', textAlign: 'left', marginBottom: '25px' }}>
                    <h4 style={{ fontSize: '14px', color: '#666', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>상세 분석 내역</h4>
                    {logs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#007bff' }}>Step {idx + 1}</span>
                                <span style={{ 
                                    fontSize: '10px', color: '#fff', padding: '2px 8px', borderRadius: '10px',
                                    background: log.is_speaking_correct ? '#2ecc71' : '#ff4757' 
                                }}>
                                    {log.is_speaking_correct ? 'Correct' : 'Check'}
                                </span>
                            </div>
                            <p style={{ fontSize: '14px', color: '#555', marginTop: '5px', fontWeight: '500' }}>
                                🎯 {log.question_text}
                            </p>
                            <p style={{ fontSize: '14px', color: log.is_speaking_correct ? '#2ecc71' : '#ff6b6b', marginTop: '3px' }}>
                                🗣️ {log.student_transcript || "(No Response)"}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button className="go_btn" style={{ width: '100%', padding: '15px', borderRadius: '15px' }} onClick={onNext}>
                        NEXT: UNSCRAMBLE 시작
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatternDrill_SpeakingReport;