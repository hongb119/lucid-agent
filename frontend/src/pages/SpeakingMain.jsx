import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SpeakingMain = ({ step, itemArray, userId, taskId, branchCode, onFinish, onStepChange }) => {
    // --- [1] 상태 관리 ---
    const [itemNo, setItemNo] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [localItems, setLocalItems] = useState([]);
    const [timerCnt, setTimerCnt] = useState(0);
    const [micPermission, setMicPermission] = useState('prompt'); 

    // --- [2] Refs (기능 유지용) ---
    const audioRef = useRef(null);
    const scrollRef = useRef(null);
    const activeSentenceRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const autoNextTimeoutRef = useRef(null);
    const recordingStartTimeRef = useRef(0);

    const canvasRef = useRef(null);
    const audioCtxRef = useRef(null);
    const animationRef = useRef(null);

    // --- [추가] 오디오 데시벨 분석 함수 (함수 외부에 두셔도 됩니다) ---
    const getAverageDecibels = async (blob) => {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const tempCtx = new AudioContext();
            const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
            const rawData = audioBuffer.getChannelData(0); // 첫 번째 채널 사용
            
            let sumSquares = 0;
            for (const amplitude of rawData) {
                sumSquares += amplitude * amplitude;
            }
            const rms = Math.sqrt(sumSquares / rawData.length);
            const db = rms > 0 ? 20 * Math.log10(rms) : -100;
            
            tempCtx.close();
            return db;
        } catch (e) {
            console.error("데시벨 분석 실패:", e);
            return -100; // 에러 발생 시 아주 낮은 값 반환
        }
    };

    // [고도화] 마이크 권한 실시간 모니터링
    const monitorMicPermission = async () => {
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const result = await navigator.permissions.query({ name: 'microphone' });
                setMicPermission(result.state);
                result.onchange = () => setMicPermission(result.state);
            } catch (e) {
                console.warn("Permission API 미지원 브라우저");
            }
        }
    };

    // [최종 수정] 마이크 에러 핸들러: 쉐도잉(Step 1) 첫 문장으로 리셋
    const handleError = (errorName) => {
        setIsRecording(false);
        let userMessage = "마이크 초기화에 실패했습니다.";
        
        switch (errorName) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                userMessage = "마이크 권한이 거부되었습니다.\n주소창의 자물쇠 아이콘을 눌러 허용으로 변경해 주세요.";
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                userMessage = "마이크가 다른 프로그램에서 사용 중입니다.\n다른 앱을 종료하고 다시 시도해 주세요.";
                break;
            default:
                console.error("Recording Error:", errorName);
        }

        // 🚩 안내 후 쉐도잉 단계로 리셋
        alert(`${userMessage}\n\n음성을 다시 듣고 마이크를 점검한 후 재시도해 주세요.`);
        
        // 타이머 및 자동 전환 정리
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        
        // 🚩 1단계(Shadowing)로 이동 및 인덱스/타이머 초기화
        onStepChange(1);
        setItemNo(0);
        setTimerCnt(0);
        setIsProcessing(false);
    };

    // --- [3] 초기화 및 데이터 세팅 ---
    useEffect(() => {
        monitorMicPermission();
        const initialized = itemArray.map(item => ({
            ...item,
            speaking_corr_cnt: 0,
            speaking_incorr_cnt: item.study_eng.split(" ").length,
            speaking_timer: 0,
            transcribed: ""
        }));
        setLocalItems(initialized);
    }, [itemArray]);

    // --- [4] 문장 관리 및 오디오 재생 (Shadowing) ---
    useEffect(() => {
        // 데이터가 아직 준비되지 않았거나 분석 중이면 중단
        if (localItems.length === 0 || isProcessing) return;

        const currentItem = localItems[itemNo];
        if (!currentItem) return;

        // Step 1(Shadowing) 모드일 때만 음성 자동 재생
        if (step === 1 && audioRef.current) {
            console.log(`🔊 ${itemNo + 1}번 문장 재생 시작: ${currentItem.study_mp3_file}`);
            
            // 기존 재생 중인 오디오 정지 및 소스 교체
            audioRef.current.pause();
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${currentItem.study_mp3_file}`;
            
            // 브라우저 정책 대응: play()는 반드시 catch를 달아줘야 멈춤 현상을 방지합니다.
            audioRef.current.play().catch(e => {
                console.warn("오디오 자동 재생이 차단되었습니다. 사용자 상호작용이 필요합니다.", e);
            });
        }

        // 스크롤 포커스 이동 (가독성을 위해 0.1초 딜레이)
        setTimeout(() => {
            if (activeSentenceRef.current && scrollRef.current) {
                const container = scrollRef.current;
                const element = activeSentenceRef.current;
                container.scrollTo({ 
                    top: element.offsetTop - container.offsetTop - 50, 
                    behavior: 'smooth' 
                });
            }
        }, 100);

    }, [itemNo, step, localItems.length, isProcessing]);

    // --- [5] 비주얼라이저 (파형) ---
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

    // --- [6] 문장 자동 전환 (Fluency 모드 전용) ---
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

    // --- [7] 서버 전송 및 분석 (핵심 기능) ---
    const processBatchAnalysis = async (blob) => {
        setIsProcessing(true); 
        const formData = new FormData();

        if (!userId || !taskId || !branchCode) {
            alert("필수 데이터 누락! 관리자에게 문의하세요.");
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
            console.error("❌ 분석 서버 에러:", err.response?.data);
            alert("AI 분석 서버와 통신 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRecording = async () => {
        // AI 분석 중이면 중단
        if (isProcessing) return;

        // 마이크 권한 차단 상태 체크
        if (micPermission === 'denied') {
            alert("마이크 권한이 차단되어 있습니다. 설정 변경 후 다시 시작해 주세요.");
            onStepChange(1);
            setItemNo(0);
            return;
        }
        
        if (!isRecording) {
            // --- [녹음 시작 로직] ---
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                startVisualizer(stream);
                
                // 🚩 녹음 시작 시간 기록 (너무 짧은 녹음 방지용)
                recordingStartTimeRef.current = Date.now();
                
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (e) => {
                    if (e.data.size > 0) audioChunksRef.current.push(e.data);
                };
                
                mediaRecorderRef.current.onstop = async () => {
                    // 🚩 [방어 로직] 녹음 버튼을 누른 지 0.8초가 안 지났다면 무효 처리
                    const duration = Date.now() - recordingStartTimeRef.current;
                    if (duration < 800) {
                        console.warn("너무 짧은 녹음 시도 (무시됨)");
                        // 상태만 초기화하고 리셋(쉐도잉 이동)은 하지 않음
                        setIsRecording(false);
                        setIsProcessing(false);
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                        stream.getTracks().forEach(t => t.stop());
                        return; 
                    }

                    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    
                    // 1단계: 음성 데이터 유무 체크 (물리적 마이크 오류)
                    if (blob.size < 2000) { 
                        alert("음성이 감지되지 않았습니다.\n마이크 연결을 확인하고 다시 시작해 주세요.");
                        onStepChange(1);
                        setItemNo(0);
                        return; 
                    }

                    setIsProcessing(true);
                    const avgDb = await getAverageDecibels(blob);
                    
                    // 2단계: 소리 크기 체크 (데시벨 미달)
                    if (avgDb < -45) {
                        alert("마이크 소리가 너무 작습니다.\n볼륨 확인 후 다시 시작해 주세요.");
                        onStepChange(1);
                        setItemNo(0);
                        return;
                    }

                    // 모든 검사 통과 시 AI 분석 서버 전송
                    await processBatchAnalysis(blob);

                    // 스트림 및 비주얼라이저 종료
                    stream.getTracks().forEach(t => t.stop());
                    if (animationRef.current) cancelAnimationFrame(animationRef.current);
                };

                // 녹음 시작
                mediaRecorderRef.current.start();
                setIsRecording(true);
                
                // 타이머 및 자동 문장 전환 시작
                setTimerCnt(0);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = setInterval(() => setTimerCnt(v => v + 1), 1000);
                
                startAutoSentenceSwitch(0); 

            } catch (err) {
                // 마이크 접근 실패 시 에러 핸들러 호출
                handleError(err.name);
            }
        } else {
            // --- [녹음 정지 로직] ---
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            
            // 타이머 및 타임아웃 정리
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
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
                            {micPermission === 'denied' ? (
                                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>⚠️ 마이크 권한 차단됨 (자물쇠 아이콘 확인)</span>
                            ) : isProcessing ? "AI 분석 중입니다... 잠시만 기다려주세요." : 
                             isRecording ? `녹음 중... (${timerCnt}초)` : 
                             <>들려주는 음성과 똑같은 속도로 문장을 읽어주세요.<br/>이 연습을 많이 하면 영어 말하기 왕이 될 수도 있어요.</>}
                        </span>
                    </p>
                </div>
                <div className="numbox">
                    <span>{Math.min(itemNo + 1, localItems.length)}/{localItems.length}</span>
                </div>
            </div>

            <div className="conbox2" style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="divide1" style={{ flex: 1 }}>
                    <div className="boxline he_long" ref={scrollRef} style={{ overflowY: 'auto', height: '380px' }}>
                        <div className="boxtext longtx">
                            {localItems.map((item, idx) => (
                                <div 
                                    key={idx} 
                                    ref={idx === itemNo ? activeSentenceRef : null} 
                                    className={idx === itemNo ? "tx_blue tx_bold" : ""} 
                                    style={{ 
                                        padding: '15px 10px', 
                                        fontSize: '1.8rem', // 🚀 기존 PHP 급 큰 글씨 복구
                                        lineHeight: '1.6',
                                        wordBreak: 'keep-all',
                                        transition: 'all 0.3s'
                                    }}
                                >
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
                            style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: micPermission === 'denied' ? 0.5 : 1 }}
                        >
                            <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="Mic" style={{ width: '70px' }} />
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .ch_btn.ani_btn { animation: pulse 1.5s infinite; filter: drop-shadow(0px 0px 10px #007bff); }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                .tx_blue.tx_bold { color: #007bff !important; font-weight: 800 !important; }
            `}</style>
        </div>
    );
};

export default SpeakingMain;