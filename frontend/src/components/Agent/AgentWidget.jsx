import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Mic, MicOff, Sparkles, Camera, Volume2 } from 'lucide-react';

const AgentWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([]);
    const [sessionInfo, setSessionInfo] = useState({ userId: '', branchCode: '', taskId: '', studyNo: '' });
    const [dailyWord, setDailyWord] = useState(null);
    const [hasGreeted, setHasGreeted] = useState(false); 
    
    const scrollRef = useRef(null);
    const fileInputRef = useRef(null);

    // [1] 음성 합성 (TTS) 설정
    const speak = (text) => {
        const synth = window.speechSynthesis;
        const cleanText = text
            .replace(/[#*|_~>`-]/g, '') 
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') 
            .replace(/\(([^)]+)\)/g, '$1') 
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') 
            .replace(/\s+/g, ' ') 
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ko-KR';
        utterance.rate = 1.0; 
        utterance.pitch = 1.1; 
        
        synth.cancel(); // 💡 중요: 이전 음성을 즉시 멈추고 새 음성 시작
        synth.speak(utterance);
    };

    // [2] 💡 환경 동기화 및 1회성 환영 인사 로직
    useEffect(() => {
        const performWelcome = async () => {
            const queryParams = new URLSearchParams(window.location.search);
            const uId = queryParams.get('user_id') || sessionStorage.getItem('user_id') || '';
            const sNo = queryParams.get('study_no') || queryParams.get('unit_no') || '';
            const bCd = queryParams.get('branch_code') || queryParams.get('educat_cd') || '';
            const tId = queryParams.get('task_id') || '';

            // 1. 세션 정보가 없으면 업데이트만 하고 종료
            if (!uId) return;
            if (uId !== sessionInfo.userId || sNo !== sessionInfo.studyNo) {
                setSessionInfo({ userId: uId, branchCode: bCd, taskId: tId, studyNo: sNo });
            }

            // 2. 💡 이중 잠금: 현재 상태(hasGreeted)와 브라우저 저장소(sessionStorage) 확인
            const storageKey = `greeted_${uId}_${sNo}`;
            if (hasGreeted || sessionStorage.getItem(storageKey)) return;

            try {
                // 3. 💡 즉시 차단: API 응답 전에 플래그를 먼저 세워 중복 호출 원천 봉쇄
                setHasGreeted(true);
                sessionStorage.setItem(storageKey, 'true');

                const res = await axios.post('/api/agent/welcome-personalized', { 
                    user_id: uId,
                    study_no: sNo 
                });
                
                if (res.data.status === 'success') {
                    const { greeting, recommendation } = res.data;
                    setMessages([{ role: 'ai', text: greeting }]);
                    setDailyWord(recommendation);
                    
                    // 음성 출력 (안정성을 위해 약간의 지연 후 실행)
                    setTimeout(() => speak(greeting), 800); 
                }
            } catch (err) {
                console.error("Welcome Error", err);
                // 실패 시에만 다시 시도할 수 있도록 플래그 해제 (선택 사항)
                setHasGreeted(false);
                sessionStorage.removeItem(storageKey);
            }
        };

        performWelcome();
    }, [sessionInfo.userId, sessionInfo.studyNo]); // 정보가 감지될 때만 실행 (setInterval 제거)

    // 자동 스크롤
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // [3] 음성 인식 (STT)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.lang = 'ko-KR';
        recognition.onresult = (e) => {
            const text = e.results[0][0].transcript;
            setInput(text);
            handleSend(text);
        };
        recognition.onend = () => setIsListening(false);
    }

    const toggleMic = () => {
        if (isListening) recognition.stop();
        else { setIsListening(true); recognition.start(); }
    };

    // [4] 대화 핸들러
    const handleSend = async (manualText) => {
        const text = manualText || input;
        if (!text.trim() || isTyping) return;

        setMessages(prev => [...prev, { role: 'user', text }]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await axios.post('/api/agent/ask', {
                user_id: sessionInfo.userId,
                study_no: sessionInfo.studyNo,
                question: text
            });
            setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
            speak(res.data.answer);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: '잠시 연결이 원활하지 않아. 다시 말해줄래? 😢' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || isTyping) return;
        setMessages(prev => [...prev, { role: 'user', text: "📸 사진 분석 중..." }]);
        setIsTyping(true);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Data = reader.result.split(',')[1];
            try {
                const res = await axios.post('/api/agent/ocr', { image: base64Data, user_id: sessionInfo.userId });
                setMessages(prev => [...prev, { role: 'ai', text: res.data.answer }]);
                speak(res.data.answer);
            } catch (err) {
                setMessages(prev => [...prev, { role: 'ai', text: "사진의 글자를 읽지 못했어. 다시 찍어줘! 😢" }]);
            } finally {
                setIsTyping(false);
            }
        };
    };

    return (
        <div style={styles.container}>
            {isOpen && (
                <div style={styles.chatWindow}>
                    <div style={styles.header}>
                        <Sparkles size={18} fill="white" style={{ marginRight: '8px' }} />
                        <span>루시드 AI 튜터 '루아이'</span>
                        <X size={20} onClick={() => setIsOpen(false)} style={{ marginLeft: 'auto', cursor: 'pointer' }} />
                    </div>
                    
                    <div style={styles.messageList} ref={scrollRef}>
                        {dailyWord && (
                            <div style={styles.wordCard}>
                                <div style={styles.wordLabel}>TODAY'S WORD</div>
                                <div style={styles.wordMain}>
                                    <span style={{ fontSize: '20px' }}>{dailyWord.word}</span>
                                    <Volume2 size={18} color="#4A90E2" style={{ cursor: 'pointer', marginLeft: '8px' }} onClick={() => speak(dailyWord.word)} />
                                </div>
                                <div style={styles.wordMean}>{dailyWord.phonetic} | {dailyWord.mean}</div>
                                <div style={styles.wordExample}>"{dailyWord.example}"</div>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} style={m.role === 'ai' ? styles.aiMsg : styles.userMsg}>{m.text}</div>
                        ))}
                        {isTyping && (
                            <div style={styles.typingIndicator}>
                                <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                            </div>
                        )}
                    </div>

                    <div style={styles.inputArea}>
                        <button onClick={() => fileInputRef.current.click()} style={styles.iconBtn} disabled={isTyping}>
                            <Camera size={22} color={isTyping ? "#ccc" : "#4A90E2"} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
                        <button onClick={toggleMic} style={{ ...styles.iconBtn, color: isListening ? '#FF4B4B' : '#999' }} disabled={isTyping}>
                            {isListening ? <MicOff size={22} className="pulse" /> : <Mic size={22}/>}
                        </button>
                        <input 
                            style={styles.input} 
                            value={input} 
                            placeholder={isTyping ? "루아이가 답변 준비 중..." : "궁금한 걸 물어봐!"}
                            disabled={isTyping}
                            onChange={(e)=>setInput(e.target.value)} 
                            onKeyPress={(e)=>e.key==='Enter' && handleSend()}
                        />
                        <button onClick={() => handleSend()} disabled={isTyping} style={styles.sendBtn}><Send size={18}/></button>
                    </div>
                </div>
            )}
            <button style={styles.fab} onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={28} /> : (
                    <div style={{ position: 'relative' }}>
                        <MessageCircle size={32}/>
                        {sessionInfo.userId && <div style={styles.onlineBadge} />}
                    </div>
                )}
            </button>

            <style>{`
                @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes dot-blink { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                .pulse { animation: pulse 1.5s infinite; }
                .dot { width: 6px; height: 6px; background: #4A90E2; border-radius: 50%; display: inline-block; animation: dot-blink 1.4s infinite; margin-right: 3px; }
                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }
            `}</style>
        </div>
    );
};

// 스타일 객체 (생략 - 기존과 동일)
const styles = {
    container: { position: 'fixed', bottom: '25px', right: '25px', zIndex: 9999 },
    fab: { width: '70px', height: '70px', borderRadius: '35px', backgroundColor: '#FFD700', color: '#333', border: '4px solid white', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    onlineBadge: { position: 'absolute', top: '-5px', right: '-5px', width: '14px', height: '14px', backgroundColor: '#4CAF50', borderRadius: '50%', border: '2px solid white' },
    chatWindow: { width: '340px', height: '540px', backgroundColor: 'white', borderRadius: '25px', boxShadow: '0 15px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', marginBottom: '15px', overflow: 'hidden' },
    header: { padding: '15px 20px', backgroundColor: '#4A90E2', color: 'white', display: 'flex', alignItems: 'center', fontWeight: 'bold' },
    messageList: { flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '10px' },
    wordCard: { background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)', padding: '15px', borderRadius: '20px', border: '1px solid #bae6fd', marginBottom: '10px', textAlign: 'center' },
    wordLabel: { fontSize: '10px', fontWeight: 'bold', color: '#0284c7', marginBottom: '4px' },
    wordMain: { display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', color: '#1e293b' },
    wordMean: { fontSize: '13px', color: '#64748b', margin: '4px 0' },
    wordExample: { fontSize: '12px', color: '#475569', fontStyle: 'italic', background: 'white', padding: '6px', borderRadius: '10px', marginTop: '6px' },
    typingIndicator: { alignSelf: 'flex-start', background: 'white', padding: '10px 15px', borderRadius: '18px 18px 18px 0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    aiMsg: { alignSelf: 'flex-start', background: 'white', padding: '12px 16px', borderRadius: '18px 18px 18px 0', fontSize: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', maxWidth: '85%', lineHeight: '1.5' },
    userMsg: { alignSelf: 'flex-end', background: '#4A90E2', color: 'white', padding: '12px 16px', borderRadius: '18px 18px 0 18px', fontSize: '14px', maxWidth: '85%' },
    inputArea: { padding: '15px', display: 'flex', borderTop: '1px solid #eee', gap: '10px', alignItems: 'center', backgroundColor: 'white' },
    input: { flex: 1, border: '1px solid #E2E8F0', borderRadius: '20px', padding: '10px 15px', outline: 'none', fontSize: '14px' },
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '5px' },
    sendBtn: { background: '#4A90E2', border: 'none', color: 'white', width: '38px', height: '38px', borderRadius: '19px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default AgentWidget;