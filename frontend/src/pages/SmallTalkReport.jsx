import React, { useState } from 'react';
import axios from 'axios';

const SmallTalkReport = ({ summary, logs, userName, onClose }) => {
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    const playSummaryTTS = async () => {
        if (isPlayingTTS || !summary) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post('/api/smalltalk/tts', { text: summary }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const audio = new Audio(url);
            audio.onended = () => setIsPlayingTTS(false);
            audio.play();
        } catch (err) {
            console.error("TTS 재생 실패:", err);
            setIsPlayingTTS(false);
        }
    };

    return (
        <div className="boxline boxlong_w" style={{ padding: '25px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <h2 style={{ color: '#ff6b6b', fontSize: '24px', marginBottom: '10px' }}>RUAI's Conversation Report</h2>
                <p style={{ color: '#888', fontSize: '14px' }}>{userName} 학생의 대화 분석 결과입니다.</p>
                
                <div style={{ background: '#fdf2f2', padding: '15px', borderRadius: '15px', border: '1px solid #ffc9c9', marginTop: '15px' }}>
                    <p style={{ lineHeight: '1.7', fontSize: '15px', color: '#333', whiteSpace: 'pre-line', textAlign: 'left' }}>
                        {summary}
                    </p>
                </div>
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', textAlign: 'left', padding: '10px', background: '#f9f9f9', borderRadius: '10px' }}>
                <h4 style={{ marginBottom: '12px', color: '#555', fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>상세 대화 내역</h4>
                {logs && logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: '#ff6b6b', fontWeight: 'bold' }}>Q{log.ai_no}</span>
                            <span style={{
                                fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff',
                                background: log.result_status === 'CORRECT' ? '#2ecc71' : '#ff4757'
                            }}>
                                {log.result_status === 'CORRECT' ? 'Excellent' : 'Check'}
                            </span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#333', marginTop: '5px' }}>
                           🗣️ {log.student_transcript || "(No Response)"}
                        </p>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '25px' }}>
                <button onClick={playSummaryTTS} style={{ padding: '10px 20px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {isPlayingTTS ? "Playing..." : "리포트 듣기 🔊"}
                </button>
                <button onClick={onClose} style={{ padding: '10px 20px', background: '#444', color: '#fff', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: 'bold' }}>
                    학습 완료 확인
                </button>
            </div>
        </div>
    );
};

export default SmallTalkReport;