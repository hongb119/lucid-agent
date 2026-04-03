import React, { useState } from 'react';
import axios from 'axios';

const SmallTalkReport = ({ summary, logs, userName, onClose, onRetry }) => {
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    const cleanSummary = (text) => {
        if (!text) return "";
        const forbiddenWords = [
            /구독과?\s?좋아요/g, /알림\s?설정/g, /채널\s?방문/g,
            /영상\s?시청해주셔서/g, /다음\s?영상에서/g, /수고하셨습니다/g,
            /숙제\s?일부\s?완료/g 
        ];
        let filteredText = text;
        forbiddenWords.forEach(pattern => {
            filteredText = filteredText.replace(pattern, "");
        });

        // 🚩 [추가] GPT 특유의 마크업 기호(*, ") 제거하여 TTS를 더 자연스럽게 만듭니다.
        return filteredText.replace(/[\*\"]/g, "").trim();
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
                <h2 style={{ color: '#ff6b6b', fontSize: '24px', marginBottom: '8px', fontWeight: 'bold' }}>RUAI's Talking Report</h2>
                <p style={{ color: '#666', fontSize: '15px' }}>
                    <b>{userName}</b> 학생! 루아이와 즐겁게 대화했나요? 😊
                </p>
                
                <div style={{ 
                    background: '#fff9f9', 
                    padding: '25px', 
                    borderRadius: '20px', 
                    border: '2px dashed #ffc9c9', 
                    marginTop: '20px',
                    position: 'relative',
                    minHeight: '80px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <img src="/static/study/images/icon01.png" alt="AI" style={{ width: '45px', position: 'absolute', top: '-22px', left: '20px' }} />
                    
                    <p style={{ lineHeight: '1.8', fontSize: '16px', color: '#444', whiteSpace: 'pre-line', textAlign: 'left', margin: 0, width: '100%' }}>
                        {filteredSummary ? (
                            filteredSummary
                        ) : (
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
                    오늘 내가 말한 문장들
                </h4>
                {logs && logs.length > 0 ? (
                    logs.map((log, index) => (
                        <div key={index} style={{ marginBottom: '12px', padding: '15px', background: '#fff', borderRadius: '15px', border: '1px solid #f0f0f0', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <span style={{ fontSize: '11px', color: '#ff6b6b', background: '#fff0f0', padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold', minWidth: '35px', textAlign: 'center', marginTop: '3px' }}>
                                    #{index + 1}
                                </span>
                                <p style={{ fontSize: '15px', color: '#444', fontWeight: '500', margin: 0, lineHeight: '1.4' }}>
                                    "{log.student_transcript || "(대답을 듣지 못했어요 😢)"}"
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>대화 기록이 없어요.</p>
                )}
            </div>

            {/* 하단 버튼 영역 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '30px' }}>
                {/* 🚩 [수정] summary가 없을 때는 버튼을 비활성화하고 색상을 흐리게 바꿉니다. */}
                <button 
                    onClick={playSummaryTTS} 
                    disabled={!filteredSummary || isPlayingTTS}
                    style={{ 
                        padding: '14px 25px', 
                        background: (filteredSummary && !isPlayingTTS) ? '#ff6b6b' : '#ccc', 
                        color: '#fff', 
                        border: 'none', 
                        borderRadius: '50px', 
                        cursor: (filteredSummary && !isPlayingTTS) ? 'pointer' : 'default', 
                        fontWeight: 'bold', 
                        boxShadow: (filteredSummary && !isPlayingTTS) ? '0 8px 20px rgba(255,107,107,0.3)' : 'none', 
                        flex: '1 1 auto', 
                        minWidth: '200px'
                    }}
                >
                    {isPlayingTTS ? "루아이가 말하는 중... 🎤" : "루아이 목소리로 듣기 🔊"}
                </button>
                <button onClick={onRetry} style={{ padding: '14px 20px', background: '#fff', color: '#ff6b6b', border: '2px solid #ff6b6b', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
                    한 번 더 대화하기 🔄
                </button>
                <button onClick={onClose} style={{ padding: '14px 20px', background: '#555', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', flex: '1 1 auto' }}>
                    학습 마칠게요
                </button>
            </div>
        </div>
    );
};

export default SmallTalkReport;