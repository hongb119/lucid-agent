import React, { useState } from 'react';
import axios from 'axios';

const SmallTalkReport = ({ summary, logs, userName, onClose }) => {
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    // [디버깅] 불필요한 멘트(구독, 좋아요 등)를 삭제하는 필터링 함수
    const cleanSummary = (text) => {
        if (!text) return "";
        // 삭제하고 싶은 키워드들을 정규식으로 등록합니다.
        const forbiddenWords = [
            /구독과?\s?좋아요/g,
            /알림\s?설정/g,
            /채널\s?방문/g,
            /영상\s?시청해주셔서/g,
            /다음\s?영상에서/g
        ];
        
        let filteredText = text;
        forbiddenWords.forEach(pattern => {
            filteredText = filteredText.replace(pattern, "");
        });
        
        return filteredText.trim();
    };

    // 필터링된 요약본 생성
    const filteredSummary = cleanSummary(summary);

    const playSummaryTTS = async () => {
        // [수정] TTS 재생 시에도 필터링된 텍스트를 사용하도록 변경
        if (isPlayingTTS || !filteredSummary) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post('/api/smalltalk/tts', { text: filteredSummary }, { responseType: 'blob' });
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
                
                {/* 전체 요약 리포트 영역 */}
                <div style={{ background: '#fdf2f2', padding: '15px', borderRadius: '15px', border: '1px solid #ffc9c9', marginTop: '15px' }}>
                    <p style={{ lineHeight: '1.7', fontSize: '15px', color: '#333', whiteSpace: 'pre-line', textAlign: 'left' }}>
                        {/* [수정] 필터링된 요약본 출력 */}
                        {filteredSummary || "대화 내용을 분석 중입니다..."}
                    </p>
                </div>
            </div>

            {/* 상세 대화 내역 리스트 (기존 로직 보존) */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', padding: '10px', background: '#f9f9f9', borderRadius: '10px' }}>
                <h4 style={{ marginBottom: '12px', color: '#555', fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>상세 대화 내역</h4>
                {logs && logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '15px', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#ff6b6b', fontWeight: 'bold' }}>Question {log.ai_no}</span>
                            <span style={{
                                fontSize: '10px', padding: '3px 10px', borderRadius: '20px', color: '#fff',
                                background: log.result_status === 'CORRECT' ? '#2ecc71' : '#ff4757',
                                fontWeight: 'bold'
                            }}>
                                {log.result_status === 'CORRECT' ? 'Excellent' : 'Check'}
                            </span>
                        </div>
                        
                        <div style={{ marginBottom: '10px' }}>
                            <p style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '3px' }}>AI QUESTION (정답)</p>
                            <p style={{ fontSize: '14px', color: '#34495e', background: '#f0f4f8', padding: '10px', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
                                {log.question_text}
                            </p>
                        </div>

                        <div>
                            <p style={{ fontSize: '11px', color: '#999', fontWeight: '600', marginBottom: '3px' }}>STUDENT SPEECH (나의 대답)</p>
                            <p style={{ fontSize: '14px', color: '#ff6b6b', fontWeight: '500', paddingLeft: '10px' }}>
                                🗣️ {log.student_transcript || "(No Response)"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 버튼 영역 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '25px' }}>
                <button onClick={playSummaryTTS} style={{ padding: '12px 25px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(255,107,107,0.3)' }}>
                    {isPlayingTTS ? "Playing..." : "리포트 듣기 🔊"}
                </button>
                <button onClick={onClose} style={{ padding: '12px 25px', background: '#444', color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold' }}>
                    학습 완료 확인
                </button>
            </div>
        </div>
    );
};

export default SmallTalkReport;