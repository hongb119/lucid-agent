import React, { useState } from 'react';
import axios from 'axios';

const SpeakingReport = ({ result, itemArray, onClose }) => {
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);
    console.log("📍 [로그 7] 리포트 컴포넌트 렌더링 시작. 데이터:", result);
    // [방어 코드] 데이터가 로드되지 않았을 때
    if (!result) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#fff' }}>
                <p>리포트 데이터를 분석 중입니다...</p>
            </div>
        );
    }

    // AI 선생님 음성 재생 (TTS)
    const playReportSpeech = async () => {
        if (!result.overall_feedback || isPlayingTTS) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post('/api/speaking/tts', { text: result.overall_feedback }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const audio = new Audio(url);
            audio.onended = () => setIsPlayingTTS(false);
            audio.play();
        } catch (err) { 
            setIsPlayingTTS(false);
            console.error("TTS 재생 실패"); 
        }
    };

    return (
        <div style={reportModalOverlayStyle}>
            <div style={reportContainerStyle}>
                <div style={reportHeaderStyle}>
                    <h2 style={{margin:0, color:'#fff', fontSize:'22px'}}>Speaking Report</h2>
                </div>

                <div style={{padding:'20px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                    {/* 상단 스코어 그리드 */}
                    <div className="score_grid" style={scoreGridStyle}>
                        <div style={scoreItemStyle}><span>Accuracy</span><strong style={{color:'#007bff'}}>{result.accuracy || 'Excellent'}</strong></div>
                        <div style={scoreItemStyle}><span>WPM</span><strong>{result.wpm || '-'}</strong></div>
                        <div style={scoreItemStyle}><span>Time</span><strong>{result.duration || '-'}</strong></div>
                    </div>

                    {/* [핵심 수정] 문장별 결과 리스트 매핑 */}
                    <div style={reportScrollStyle}>
                        {itemArray && itemArray.map((item, idx) => {
                            // 부모에게서 받은 result.analysis 배열에서 현재 인덱스의 데이터를 안전하게 추출
                            const analysisData = Array.isArray(result.analysis) ? result.analysis : [];
                            const match = analysisData[idx] || {};

                            return (
                                <div key={idx} style={sentenceRowStyle}>
                                    <p style={{margin:'0 0 5px 0', color:'#555', fontSize:'13px'}}>🎯 {item.study_eng}</p>
                                    <p style={{margin:0, color:'#007bff', fontWeight:'bold', fontSize:'15px'}}>
                                        🗣️ {match.transcribed || "인식된 문장이 없습니다."}
                                    </p>
                                    {match.feedback && (
                                        <p style={{margin:'5px 0 0 0', color:'#e91e63', fontSize:'12px', fontStyle:'italic'}}>
                                            💡 {match.feedback}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* AI 코멘트 영역 */}
                    <div style={feedbackBoxStyle}>
                        <p style={{margin:'0 0 10px 0', fontWeight:'bold', color:'#333'}}>AI Teacher's Comment</p>
                        <p style={{margin:'0 0 15px 0', fontSize:'14px', lineHeight:'1.5', color:'#444'}}>
                            {result.overall_feedback || "잠시만 기다려주세요. 선생님이 의견을 정리 중입니다."}
                        </p>
                        {result.overall_feedback && (
                            <button onClick={playReportSpeech} disabled={isPlayingTTS} style={ttsButtonStyle}>
                                {isPlayingTTS ? "재생 중..." : "AI 선생님 음성 듣기 🔊"}
                            </button>
                        )}
                    </div>
                    
                    <button onClick={onClose} style={closeButtonStyle}>학습 마치기</button>
                </div>
            </div>
        </div>
    );
};

// --- 스타일 정의 (기존 레이아웃 유지) ---
const reportModalOverlayStyle = { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' };
const reportContainerStyle = { width:'520px', maxWidth:'95%', height:'85vh', background:'#fff', borderRadius:'20px', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 0 30px rgba(0,0,0,0.5)' };
const reportHeaderStyle = { background:'#007bff', padding:'20px', textAlign:'center' };
const scoreGridStyle = { display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'15px' };
const scoreItemStyle = { textAlign:'center', flex:1, borderRight:'1px solid #eee' };
const reportScrollStyle = { flex:1, overflowY:'auto', padding:'15px', background:'#f9f9f9', borderRadius:'15px', marginBottom:'20px', border:'1px solid #eee' };
const sentenceRowStyle = { borderBottom:'1px solid #eee', paddingBottom:'12px', marginBottom:'12px' };
const feedbackBoxStyle = { background:'#eef7ff', padding:'15px', borderRadius:'15px', textAlign:'center', marginBottom:'20px' };
const ttsButtonStyle = { padding:'10px 20px', background:'#28a745', color:'#fff', border:'none', borderRadius:'50px', cursor:'pointer', fontWeight:'bold' };
const closeButtonStyle = { width:'100%', padding:'18px', background:'#6c757d', color:'#fff', border:'none', borderRadius:'12px', cursor:'pointer', fontSize:'16px', fontWeight:'bold' };

export default SpeakingReport;