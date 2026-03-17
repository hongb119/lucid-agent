import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SpeakingStudyPage = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code');
    const API_BASE = import.meta.env.VITE_API_URL || '';

    // --- 상태 관리 ---
    const [step, setStep] = useState(1); 
    const [isIntro, setIsIntro] = useState(true);
    const [itemNo, setItemNo] = useState(0); 
    const [itemArray, setItemArray] = useState([]); 
    const [dayTaskView, setDayTaskView] = useState(null);
    const [showNextBtn, setShowNextBtn] = useState(false); 
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaved, setIsSaved] = useState(false); 
    const [fluencyResult, setFluencyResult] = useState({ word: '-', wpm: '-', accuracy: '-', duration: '-' });
    const [showReport, setShowReport] = useState(false);
    const [overallFeedback, setOverallFeedback] = useState("");
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    // --- Ref 관리 ---
    const audioRef = useRef(null); 
    const scrollRef = useRef(null); 
    const activeSentenceRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(0);
    const timerIntervalRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const audioCtxRef = useRef(null);

    // 1. 초기 로드 및 CSS 연결
    useEffect(() => {
        const fetchAllData = async () => {
            if (!taskId) return;
            try {
                const res = await axios.get(`${API_BASE}/api/speaking/info`, { params: { task_id: taskId } });
                if (res.data && res.data.dayTaskView) {
                    setDayTaskView(res.data.dayTaskView);
                    setItemArray((res.data.studySentenceList || []).map(item => ({
                        ...item, speaking_corr_cnt: 0, speaking_incorr_cnt: item.study_eng.split(" ").length, speaking_timer: 0, transcribed: "" 
                    })));
                }
            } catch (err) { console.error("Data Load Error"); }
        };

        const loadCSS = (file) => {
            const link = document.createElement("link");
            link.rel = "stylesheet"; 
            link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
            document.head.appendChild(link);
        };
        
        ["default.css", "content.css", "lucid_study_standard.css"].forEach(loadCSS);
        fetchAllData();
    }, [taskId]);

    // 2. 자동 스크롤 및 6초 롤링 로직 (기능 누락 방지)
    useEffect(() => {
        if (!isIntro && itemArray.length > 0) {
            if (step === 1 && audioRef.current && itemNo < itemArray.length) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${itemArray[itemNo].study_mp3_file}`;
                audioRef.current.play().catch(() => {});
            }
            if (activeSentenceRef.current && scrollRef.current) {
                scrollRef.current.scrollTo({ 
                    top: activeSentenceRef.current.offsetTop - scrollRef.current.offsetTop - 50, 
                    behavior: 'smooth' 
                });
            }
        }

        let rollingTimer;
        if (isRecording && step === 2) {
            rollingTimer = setInterval(() => {
                setItemNo(prev => (prev + 1 < itemArray.length ? prev + 1 : prev));
            }, 6000); 
        }
        return () => clearInterval(rollingTimer);
    }, [itemNo, step, isIntro, itemArray, isRecording]);

    // 3. 녹음 기능 및 분석 (기능 보존)
    const toggleRecording = async () => {
        if (isProcessing || isSaved) return;
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
                setItemNo(0); 
                timerRef.current = 0;
                timerIntervalRef.current = setInterval(() => { timerRef.current++; }, 1000);
            } catch (err) { alert("마이크 권한을 허용해주세요."); }
        } else {
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

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
        const canvasCtx = canvasRef.current.getContext("2d");
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);
            canvasCtx.fillStyle = "#202020";
            canvasCtx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                let barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(50, 150, ${barHeight + 100})`;
                canvasCtx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    };

    const processBatchAnalysis = async (blob) => {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('audio_file', new File([blob], 'record.wav'));
        formData.append('user_code', userId || 'guest');
        formData.append('task_id', taskId);
        formData.append('branch_code', branchCode || 'base');
        formData.append('target_sentences', JSON.stringify(itemArray.map(i => i.study_eng)));
        try {
            const res = await axios.post(`${API_BASE}/api/speaking/ai-analysis-batch`, formData);
            const { analysis } = res.data;
            const updated = itemArray.map((item, idx) => {
                const match = analysis[idx] || {};
                return {
                    ...item, transcribed: match.transcribed || "",
                    speaking_corr_cnt: Math.round(((match.score || 0) / 100) * item.speaking_incorr_cnt),
                    speaking_timer: Math.round(timerRef.current / itemArray.length)
                };
            });
            setItemArray(updated);
            await calculateAndSave(updated); 
        } catch (err) { alert("분석 에러"); setIsProcessing(false); }
    };

    const calculateAndSave = async (finalArray) => {
        if (isSaved) return;
        let tCorr = 0, tWords = 0, tTime = 0;
        finalArray.forEach(item => { tCorr += item.speaking_corr_cnt; tWords += item.speaking_incorr_cnt; tTime += item.speaking_timer; });
        const wpm = Math.round((tWords / (tTime || 1)) * 60);
        const score = Math.round((tCorr / tWords) * 100);
        let grade = score < 60 ? "Bad" : score < 85 ? "Good" : "Excellent";
        const durationStr = `${Math.floor(tTime / 60)}:${(tTime % 60).toString().padStart(2, '0')}`;
        setFluencyResult({ word: tWords, duration: durationStr, wpm, accuracy: grade });
        try {
            const summaryRes = await axios.post(`${API_BASE}/api/speaking/final-summary`, { results: finalArray.map(i => ({ study_eng: i.study_eng, transcribed: i.transcribed })) });
            const reportPayload = {
                task_id: parseInt(taskId), user_id: userId || 'guest', branch_code: branchCode || 'base',
                accuracy: grade, wpm, duration: durationStr, word_count: tWords, score,
                overall_feedback: summaryRes.data.summary,
                details: finalArray.map(i => ({ study_eng: i.study_eng, transcribed: i.transcribed || "" }))
            };
            await axios.post(`${API_BASE}/api/speaking/save-report`, reportPayload);
            setOverallFeedback(summaryRes.data.summary);
            setIsSaved(true); setShowReport(true);
        } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };

    const playReportSpeech = async () => {
        if (!overallFeedback || isPlayingTTS) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post(`${API_BASE}/api/speaking/tts`, { text: overallFeedback }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const audio = new Audio(url);
            audio.onended = () => setIsPlayingTTS(false);
            audio.play();
        } catch (err) { setIsPlayingTTS(false); }
    };

    const handleForceNext = () => { setStep(2); setItemNo(0); setShowNextBtn(false); };

    if (!dayTaskView) return <div className="loading">Loading...</div>;

    return (
        <div id="eduwrap">
            <audio ref={audioRef} onEnded={() => { if(step===1 && itemNo+1 < itemArray.length) setItemNo(n=>n+1); else setShowNextBtn(true); }} />
            
            {showReport && (
                <div className="reportModalOverlayStyle">
                    <div className="reportContainerStyle">
                        <div className="reportHeaderStyle"><h2 style={{margin:0, color:'#fff'}}>Speaking Report</h2></div>
                        <div style={{padding:'20px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                            <div className="scoreGridStyle">
                                <div className="scoreItemStyle"><span>Accuracy</span><strong>{fluencyResult.accuracy}</strong></div>
                                <div className="scoreItemStyle"><span>WPM</span><strong>{fluencyResult.wpm}</strong></div>
                                <div className="scoreItemStyle"><span>Time</span><strong>{fluencyResult.duration}</strong></div>
                            </div>
                            <div className="reportScrollStyle">
                                {itemArray.map((item, idx) => (
                                    <div key={idx} className="sentenceRowStyle">
                                        <p style={{margin:'0 0 5px 0', color:'#555', fontSize:'13px'}}>🎯 {item.study_eng}</p>
                                        <p style={{margin:0, color:'#007bff', fontWeight:'bold'}}>🗣️ {item.transcribed || "..."}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="feedbackBoxStyle">
                                <p style={{margin:'0 0 10px 0', fontWeight:'bold', color:'#333'}}>AI 선생님 코멘트</p>
                                <p style={{margin:'0 0 15px 0', fontSize:'14px', lineHeight:'1.5'}}>{overallFeedback}</p>
                                <button onClick={playReportSpeech} className="ttsButtonStyle">AI 음성 듣기 🔊</button>
                            </div>
                            <button onClick={() => window.close()} className="closeButtonStyle">학습 마치기</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{dayTaskView?.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit{dayTaskView?.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={step === 1 ? "on" : ""}><a>SHADOWING</a></li>
                    <li className={step === 2 ? "on" : ""}><a>FLUENCY</a></li>
                </ul>
            </div>

            <div className="educontainer">
                {isIntro ? (
                    <div className="agent-ipad" style={{display:'block'}}><div className="start_page">
                        <p className="t1">신나는 LUCID SPEAKING 학습을 시작할게요.</p>
                        <p class="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
                        <button type="button" onClick={() => setIsIntro(false)}>START</button>
                    </div></div>
                ) : (
                    <div className="agent-content">
                        <div className="conbox1">
                            <div className="speech">
                                <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                                <p className="bubble_tx">
                                    <span className="tx_box">
                                        {isProcessing ? "AI 분석 중입니다. 잠시만 기다려주세요..." : 
                                         isRecording ? "전체 문장을 끝까지 읽어주세요." : "마이크를 클릭하고 문장을 읽어보세요."}
                                    </span>
                                </p>
                            </div>
                            <div className="numbox"><span>{Math.min(itemNo + 1, itemArray.length)}/{itemArray.length}</span></div>
                        </div>

                        <div className="conbox2" style={{minHeight: '400px', position: 'relative'}}>
                            {isProcessing && (
                                <div className="analyzingOverlayStyle">
                                    <div className="loader"></div>
                                    <p style={{marginTop:'20px', fontWeight:'bold', color:'#007bff'}}>AI 분석 중입니다...</p>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="divide2" style={{float:'right', width:'280px', marginLeft:'20px'}}>
                                    <div className="divide2_1">
                                        <div className="tit1">AI Analysis</div>
                                        <div className="txs">
                                            <div className="linetx"><p className="tx1">Accuracy</p><p className="tx2 tx_blue">{fluencyResult.accuracy}</p></div>
                                            <div className="linetx"><p className="tx1">My WPM</p><p className="tx2">{fluencyResult.wpm}</p></div>
                                        </div>
                                    </div>
                                    <canvas ref={canvasRef} width="280" height="80" style={{marginTop:'10px', borderRadius:'15px', background: '#202020'}}></canvas>
                                </div>
                            )}
                            <div className="boxline he_long" ref={scrollRef} style={{width: step === 2 ? 'calc(100% - 300px)' : '100%'}}>
                                <div className="boxtext longtx">
                                    {itemArray.map((item, index) => (
                                        <div key={index} ref={index === itemNo ? activeSentenceRef : null} 
                                             className={index === itemNo ? "tx_blue tx_bold" : ""}
                                             style={{marginBottom:'15px', display:'block'}}>
                                            {item.study_eng}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="he"></div>
                        <div className="ftbtns">
                            {step === 1 ? (
                                <>
                                    <button type="button" className="btn_return" onClick={handleForceNext} style={{color:'#ff9800'}}>
                                        FLUENCY 바로가기
                                    </button>
                                    {showNextBtn && (
                                        <button type="button" className="btn_next" onClick={() => {setStep(2); setItemNo(0);}}>
                                            <span><img src="/static/study/images/btn02_1.png" alt="" /></span>NEXT
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="ftbtns" style={{marginTop:0}}>
                                    {!isSaved && !isProcessing && (
                                        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                                            <button type="button" className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} onClick={toggleRecording} style={{border:'none', background:'none'}}>
                                                <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="Mic" style={{width:'80px'}} />
                                            </button>
                                            {isRecording && <p className="mic-status-text">다 읽고 중지(제출)</p>}
                                        </div>
                                    )}
                                    {isSaved && (
                                        <button type="button" className="btn_next" onClick={() => setShowReport(true)}>
                                            <span><img src="/static/study/images/btn02_1.png" alt="" /></span>VIEW REPORT
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SpeakingStudyPage;