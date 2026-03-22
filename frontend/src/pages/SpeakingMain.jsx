import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SpeakingMain = ({ step, itemArray, userId, taskId, branchCode, onFinish, onStepChange }) => {
    const [itemNo, setItemNo] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localItems, setLocalItems] = useState([]);
    const [timerCnt, setTimerCnt] = useState(0);
    
    const audioRef = useRef(null);
    const scrollRef = useRef(null);
    const activeSentenceRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const autoNextTimeoutRef = useRef(null);

    const canvasRef = useRef(null);
    const audioCtxRef = useRef(null);
    const animationRef = useRef(null);

    // 1. 데이터 초기화
    useEffect(() => {
        const initialized = itemArray.map(item => ({
            ...item,
            speaking_corr_cnt: 0,
            speaking_incorr_cnt: item.study_eng.split(" ").length,
            speaking_timer: 0,
            transcribed: ""
        }));
        setLocalItems(initialized);
    }, [itemArray]);

    // 2. 문장 관리 및 오디오 재생
    useEffect(() => {
        if (!isProcessing && localItems[itemNo]) {
            if (step === 1 && audioRef.current) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${localItems[itemNo].study_mp3_file}`;
                audioRef.current.play().catch(() => {});
            }
            if (activeSentenceRef.current && scrollRef.current) {
                const container = scrollRef.current;
                const element = activeSentenceRef.current;
                container.scrollTo({ top: element.offsetTop - container.offsetTop - 50, behavior: 'smooth' });
            }
        }
    }, [itemNo, step, localItems, isProcessing]);

    // 3. 비주얼라이저 (파형)
    const startVisualizer = (stream) => {
        if (!canvasRef.current) return;
        if (!audioCtxRef.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtxRef.current = new AudioContext();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext("2d");
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            canvasCtx.fillStyle = "#202020";
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2.5;
                canvasCtx.fillStyle = `rgb(50, 150, ${barHeight + 150})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    };

    // 4. 문장 자동 전환
    const startAutoSentenceSwitch = (currentIndex) => {
        if (currentIndex >= localItems.length) return;
        const currentItem = localItems[currentIndex];
        const duration = (currentItem.mp3_duration || 5) * 1000; 
        autoNextTimeoutRef.current = setTimeout(() => {
            if (currentIndex + 1 < localItems.length) {
                setItemNo(prev => prev + 1);
                startAutoSentenceSwitch(currentIndex + 1);
            }
        }, duration);
    };

    const processBatchAnalysis = async (blob) => {
    setIsProcessing(true); 
    const formData = new FormData();
    
    // [디버깅] 전송 직전 실제 값들을 하나씩 확인합니다.
    console.log("🔍 [전송 직전 체크] userId:", userId);
    console.log("🔍 [전송 직전 체크] taskId:", taskId);
    console.log("🔍 [전송 직전 체크] branchCode:", branchCode);
    // [로그 2] 백엔드로 쏘기 직전, Props로 받은 데이터 확인
    console.log("🚩 [실행: SpeakingMain] 백엔드 전송 직전 Props 상태:", { userId, taskId, branchCode });

    // 값이 하나라도 없으면 전송하지 않고 중단 (422 에러 방지)
    if (!userId || !taskId || !branchCode) {
        alert(`필수 데이터 누락! \nID: ${userId}, Task: ${taskId}, Branch: ${branchCode}`);
        setIsProcessing(false);
        return;
    }

    formData.append("user_code", String(userId));
    formData.append("task_id", String(taskId)); 
    formData.append("branch_code", String(branchCode)); 
    
    const targetList = itemArray.map(item => item.study_eng);
    formData.append("target_sentences", JSON.stringify(targetList));
    formData.append("audio_file", blob, "recording.wav");

    try {
        const res = await axios.post('/api/speaking/ai-analysis-batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.status === "success") {
            onFinish(res.data.analysis, timerCnt);
        }
    } catch (err) {
        // 에러 발생 시 서버가 주는 상세 메시지를 정확히 출력
        const errorDetail = err.response?.data?.detail;
        console.error("❌ 서버 응답 에러 상세:", errorDetail);
        alert(`분석 실패: ${JSON.stringify(errorDetail)}`);
    } finally {
        setIsProcessing(false);
    }
};

    // 6. 녹음 제어
    const toggleRecording = async () => {
        if (isProcessing) return;
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                startVisualizer(stream);
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];
                mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
                
                mediaRecorderRef.current.onstop = async () => {
                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await processBatchAnalysis(blob);
                    stream.getTracks().forEach(t => t.stop());
                    if (animationRef.current) cancelAnimationFrame(animationRef.current);
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
                setTimerCnt(0);
                timerIntervalRef.current = setInterval(() => { setTimerCnt(prev => prev + 1); }, 1000);
                startAutoSentenceSwitch(0); 
            } catch (err) { alert("마이크 권한을 확인해주세요."); }
        } else {
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
            clearTimeout(autoNextTimeoutRef.current);
        }
    };

    return (
        <div className="educontainer">
            <audio ref={audioRef} onEnded={() => step === 1 && itemNo + 1 < localItems.length && setItemNo(prev => prev + 1)} />
            
            <div className="conbox1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {isProcessing ? "AI 분석 중입니다... 잠시만 기다려주세요." : 
                             isRecording ? `녹음 중... (${timerCnt}초)` : 
                             "마이크를 클릭하고 문장을 속도에 맞춰 읽어보세요."}
                        </span>
                    </p>
                </div>
                <div className="numbox">
                    <span>{Math.min(itemNo + 1, localItems.length)}/{localItems.length}</span>
                </div>
            </div>

            <div className="conbox2" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="divide1" style={{ flex: 1 }}>
                    <div className="boxline he_long" ref={scrollRef} style={{ overflowY: 'auto', height: '350px' }}>
                        <div className="boxtext longtx">
                            {localItems.map((item, idx) => (
                                <div key={idx} ref={idx === itemNo ? activeSentenceRef : null} 
                                     className={idx === itemNo ? "tx_blue tx_bold" : ""} style={{ padding: '10px', fontSize: '1.2rem' }}>
                                    {item.study_eng}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {step === 2 && (
                    <div className="divide2" style={{ width: '250px', flexShrink: 0 }}>
                        <div className="divide2_1" style={{ background: '#f8f9fa', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
                            <div className="tit1" style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>AI Waveform</div>
                            <canvas ref={canvasRef} width="220" height="95" style={{ borderRadius: '15px', background: '#202020', boxShadow: isRecording ? '0px 0px 10px blue' : 'none' }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="ftbtns" style={{ textAlign: 'center', marginTop: '30px' }}>
                {step === 1 ? (
                    <button className="btn_next" onClick={() => {onStepChange(2); setItemNo(0);}}>FLUENCY 시작</button>
                ) : (
                    <div className="btn_s_cen">
                        <button 
                            onClick={toggleRecording} 
                            className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} 
                            disabled={isProcessing}
                            style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                            <img 
                                src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} 
                                alt="Mic" 
                                style={{ width: '70px' }} 
                            />
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .ch_btn.ani_btn { animation: pulse 1.5s infinite; filter: drop-shadow(0px 0px 10px #007bff); }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
            `}</style>
        </div>
    );
};

export default SpeakingMain;