import React, { useState, forwardRef, useImperativeHandle, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Mic, Camera, Send, Sparkles, BookOpen } from 'lucide-react';

const AgentWidget = forwardRef(({ user }, ref) => {
    const [data, setData] = useState({ greeting: '', recommendation: null });
    const [bubbleVisible, setBubbleVisible] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatInputRef = useRef(null);
    const recognitionRef = useRef(null);

    // [로직 1] 음성 출력 - 특수문자 제거 및 언어별 최적화 톤
    const speak = (text, forceMute = false) => {
        if (!text || !window.speechSynthesis || forceMute) return; // forceMute가 true면 실행 안 함
        
        window.speechSynthesis.cancel();

        const cleanText = text.replace(/[^a-zA-Z0-9가-힣\s]/g, '');
        const isEnglish = /[a-zA-Z]/.test(cleanText) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(cleanText);
        
        const utterance = new window.SpeechSynthesisUtterance(cleanText);
        utterance.lang = isEnglish ? 'en-US' : 'ko-KR';
        utterance.pitch = isEnglish ? 1.4 : 1.7;
        utterance.rate = 1.0;
        
        window.speechSynthesis.speak(utterance);
    };

    // [로직 2] 스피킹(STT) - 클릭 시 토글 방식 및 시각 효과
    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("크롬 브라우저를 사용해주세요!");

        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            setInputText(transcript);
            handleSendMessage(transcript);
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // [로직 3] 채팅 전송 - 답변 길이 제어 포함
    const handleSendMessage = async (manualText) => {
        const question = manualText || inputText;
        if (!question.trim() || isTyping) return;
        
        setIsTyping(true);
        setInputText('');

        try {
            const response = await axios.post('/api/agent/ask', {
                user_id: user?.user_id || sessionStorage.getItem('user_id'),
                branch_code: user?.branch_code || sessionStorage.getItem('branch_code'),
                question: question // 백엔드 프롬프트에서 길이를 제어하므로 질문만 전송
            });
            if (response.data.status === "success") {
                setData(prev => ({ ...prev, greeting: response.data.answer }));
                speak(response.data.answer);
            }
        } catch (e) { console.error("채팅 에러:", e); }
        finally { setIsTyping(false); }
    };

    // [로직 4] 사진 분석 (OCR) - 접두어 제거 및 전송
    const handleOcrUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            setIsTyping(true);
            let base64Data = reader.result;
            if (base64Data.includes(",")) base64Data = base64Data.split(",")[1];

            try {
                const response = await axios.post('/api/agent/ocr', {
                    image: base64Data,
                    user_id: user?.user_id || sessionStorage.getItem('user_id'),
                    branch_code: user?.branch_code || sessionStorage.getItem('branch_code')
                });
                if (response.data.status === "success") {
                    setData(prev => ({ ...prev, greeting: response.data.answer }));
                    speak(response.data.answer);
                }
            } catch (e) { console.error("OCR 에러:", e); }
            finally { setIsTyping(false); }
        };
        reader.readAsDataURL(file);
    };

    // [로직 5] 초기 환영 인사 (performWelcome)
    const performWelcome = async (taskData) => {
        const userId = taskData?.user_id || user?.user_id || sessionStorage.getItem('user_id');
        if (!userId) return;
        
        try {
            // 스몰토크 여부 확인
            const isSmallTalk = taskData?.task_type === 'smalltalk';

            const response = await axios.post('/api/agent/welcome-personalized', {
                user_id: userId,
                task_id: String(taskData?.task_id || ""),
                branch_code: taskData?.branch_code || user?.branch_code || sessionStorage.getItem('branch_code'),
                re_study: taskData?.re_study || "N"
            });

            if (response.data.status === "success") {
                setData({ 
                    greeting: response.data.greeting, 
                    recommendation: response.data.recommendation 
                });
                setBubbleVisible(true);
                
                //speak(response.data.greeting);
                
            }
        } catch (e) { 
            console.error("환영인사 에러:", e); 
        }
    };

    // 외부(App.jsx) 호출용 인터페이스
    useImperativeHandle(ref, () => ({
        sayHello: (taskData) => {
            setBubbleVisible(false); // 창 초기화
            setTimeout(() => performWelcome(taskData), 100);
        }
    }));

    return (
        <div className="agent-widget-wrapper">
            {bubbleVisible && (
                <div className="agent-window">
                    <div className="agent-header">
                        <Sparkles size={16} fill="#FFD700" color="#FFD700" />
                        <span className="title">루아이 친구</span>
                        <X size={18} className="close-icon" onClick={() => setBubbleVisible(false)} />
                    </div>
                    <div className="agent-content">
                        <div className="msg-box ai">
                            <div className="avatar"><BookOpen size={12} color="#fff" /></div>
                            <div className="text" dangerouslySetInnerHTML={{ __html: data.greeting }} />
                        </div>
                    </div>
                    <div className="agent-footer">
                        <div className={`input-group ${isListening ? 'listening' : ''}`}>
                            <input 
                                ref={chatInputRef}
                                type="text" 
                                value={inputText} 
                                placeholder={isListening ? "듣고 있어요! 말씀하세요..." : "질문을 입력해!"}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <div className="tools">
                                <button className={`tool-btn mic ${isListening ? 'on' : ''}`} onClick={startListening}>
                                    <Mic size={18} />
                                </button>
                                <label className="tool-btn">
                                    <Camera size={18} />
                                    <input type="file" accept="image/*" onChange={handleOcrUpload} style={{display:'none'}} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className={`agent-trigger ${isListening ? 'active' : ''}`} onClick={() => setBubbleVisible(!bubbleVisible)}>
                <div className="trigger-inner">
                    <img src="/static/study/images/icon01.png" alt="AI" />
                </div>
                {isTyping && <div className="typing-dot">...</div>}
            </div>

            <style>{`
                .agent-widget-wrapper { position: fixed; bottom: 30px; right: 30px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; }
                .agent-window { width: 280px; background: #fff; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-bottom: 15px; overflow: hidden; display: flex; flex-direction: column; animation: slideUp 0.3s ease-out; }
                .agent-header { padding: 12px 15px; display: flex; align-items: center; border-bottom: 1px solid #f8f8f8; font-size: 13px; font-weight: bold; }
                .close-icon { margin-left: auto; cursor: pointer; color: #ccc; }
                .agent-content { padding: 15px; max-height: 200px; overflow-y: auto; background: #fff; }
                .msg-box { display: flex; gap: 8px; }
                .avatar { width: 22px; height: 22px; background: #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .msg-box .text { background: #f4f7f9; padding: 10px 14px; border-radius: 0 15px 15px 15px; font-size: 13px; line-height: 1.5; color: #444; word-break: break-all; }
                .agent-footer { padding: 10px 15px 15px; }
                .input-group { display: flex; align-items: center; background: #f0f2f5; border-radius: 12px; padding: 5px 10px; border: 2px solid transparent; transition: 0.3s; }
                .input-group.listening { border-color: #ff4b4b; background: #fff1f1; animation: pulse-border 1s infinite; }
                .input-group input { flex: 1; border: none; background: none; outline: none; font-size: 13px; padding: 8px 0; }
                .tools { display: flex; gap: 8px; border-left: 1px solid #ddd; padding-left: 8px; margin-left: 8px; }
                .tool-btn { color: #888; cursor: pointer; display: flex; align-items: center; }
                .tool-btn.mic.on { color: #ff4b4b; transform: scale(1.1); }
                .agent-trigger { cursor: pointer; position: relative; transition: 0.3s; }
                .trigger-inner { width: 70px; height: 70px; background: #FFD700; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                .trigger-inner img { width: 70%; }
                .typing-dot { position: absolute; top: -5px; right: 0; background: #333; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-border { 0%, 100% { border-color: #ff4b4b; } 50% { border-color: transparent; } }
                @keyframes blink { 50% { opacity: 0.5; } }
            `}</style>
        </div>
    );
});

export default AgentWidget;