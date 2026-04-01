import React, { useState } from 'react';
import axios from 'axios';

const SmallTalkReport = ({ summary, logs, userName, onClose }) => {
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    // [고도화] 불필요한 멘트 및 유튜브/광고성 멘트 삭제 필터링 함수
    const cleanSummary = (text) => {
        if (!text) return "";
        const forbiddenWords = [
            /구독과?\s?좋아요/g,
            /알림\s?설정/g,
            /채널\s?방문/g,
            /영상\s?시청해주셔서/g,
            /다음\s?영상에서/g,
            /수고하셨습니다/g,
            /숙제\s?일부\s?완료/g // 요청하신 딱딱한 멘트 제거
        ];
        
        let filteredText = text;
        forbiddenWords.forEach(pattern => {
            filteredText = filteredText.replace(pattern, "");
        });
        
        return filteredText.trim();
    };

    const filteredSummary = cleanSummary(summary);

    const playSummaryTTS = async () => {
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
        <div className="boxline boxlong_w" style={{ padding: '25px', background: '#fff', borderRadius: '30px', boxShadow: '0 15px 40px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                {/* 헤더 부분 다정한 문구로 변경 */}
                <h2 style={{ color: '#ff6b6b', fontSize: '24px', marginBottom: '8px', fontWeight: 'bold' }}>RUAI's Talking Report</h2>
                <p style={{ color: '#666', fontSize: '15px' }}>
                    <b>{userName}</b> 학생! 루아이와 즐겁게 대화했나요? 😊
                </p>
                
                {/* 다정한 요약 리포트 영역 */}
                <div style={{ 
                    background: '#fff9f9', 
                    padding: '20px', 
                    borderRadius: '20px', 
                    border: '2px dashed #ffc9c9', 
                    marginTop: '20px',
                    position: 'relative'
                }}>
                    {/* 에이전트 아이콘 살짝 노출 */}
                    <img src="/static/study/images/icon01.png" alt="AI" style={{ width: '40px', position: 'absolute', top: '-20px', left: '20px' }} />
                    
                    <p style={{ lineHeight: '1.8', fontSize: '16px', color: '#444', whiteSpace: 'pre-line', textAlign: 'left', margin: 0 }}>
                        {filteredSummary || (
                            <span style={{ color: '#ff8e8e', fontWeight: '500' }}>
                                ✨ 루아이가 우리의 대화 내용을 예쁘게 정리하고 있어요! 잠시만 기다려줄래?
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* 상세 내역 리스트 */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', textAlign: 'left', padding: '15px', background: '#fcfcfc', borderRadius: '20px', border: '1px solid #f0f0f0' }}>
                <h4 style={{ marginBottom: '15px', color: '#888', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ width: '4px', height: '14px', background: '#ff6b6b', borderRadius: '2px' }}></span>
                    우리가 나눈 대화 기록
                </h4>
                {logs && logs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '15px', padding: '15px', background: '#fff', borderRadius: '15px', border: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#ff6b6b', background: '#fff0f0', padding: '2px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
                                대화 {index + 1}
                            </span>
                        </div>
                        
                        <div style={{ marginBottom: '8px' }}>
                            <p style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '500' }}>
                                🤖 루아이: "{log.question_text}"
                            </p>
                        </div>

                        <div>
                            <p style={{ fontSize: '14px', color: '#ff6b6b', fontWeight: '600' }}>
                                👤 {userName}: "{log.student_transcript || "(아쉽게도 대답을 듣지 못했어요 😢)"}"
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 버튼 영역 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '30px' }}>
                <button onClick={playSummaryTTS} style={{ 
                    padding: '14px 30px', background: '#ff6b6b', color: '#fff', border: 'none', 
                    borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', 
                    boxShadow: '0 8px 20px rgba(255,107,107,0.3)', transition: '0.3s' 
                }}>
                    {isPlayingTTS ? "루아이가 말하는 중... 🎤" : "루아이 목소리로 듣기 🔊"}
                </button>
                <button onClick={onClose} style={{ 
                    padding: '14px 30px', background: '#555', color: '#fff', border: 'none', 
                    borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' 
                }}>
                    오늘 학습 마칠게요
                </button>
            </div>
        </div>
    );
};

export default SmallTalkReport;