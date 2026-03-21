import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SpeakingStudyPage = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code');
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = queryParams.get('re_study_no') || '0'; 

    const BACKEND_URL = ""; 

    // --- 상태 관리 ---
    const [isMobile, setIsMobile] = useState(false);
    const [step, setStep] = useState(1); 
    const [isIntro, setIsIntro] = useState(true);
    const [itemNo, setItemNo] = useState(0); 
    const [itemArray, setItemArray] = useState([]); 
    const [dayTaskView, setDayTaskView] = useState(null);
    const [showNextBtn, setShowNextBtn] = useState(false); 
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaved, setIsSaved] = useState(false); 
    const [debugTranscript, setDebugTranscript] = useState(""); 
    const [aiFeedback, setAiFeedback] = useState(null); 
    const [fluencyResult, setFluencyResult] = useState({ word: '-', goal: '100', duration: '-', wpm: '-', accuracy: '-' });
    
    // 리포트 관련 상태
    const [showReport, setShowReport] = useState(false);
    const [overallFeedback, setOverallFeedback] = useState("");
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);

    // --- Ref 관리 ---
    const currentItemNoRef = useRef(0);
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

    // 1. 초기 데이터 및 CSS 로드 (모바일 체크 포함)
    useEffect(() => {
        const checkMobile = () => {
            const ua = navigator.userAgent.toLowerCase();
            setIsMobile(/iphone|ipad|ipod|android/.test(ua));
        };

        const fetchAllData = async () => {
            if (!taskId) return;
            try {
                const res = await axios.get(`/api/speaking/info`, { params: { task_id: taskId } });
                if (res.data && res.data.dayTaskView) {
                    setDayTaskView(res.data.dayTaskView);
                    const initializedData = (res.data.studySentenceList || []).map(item => ({
                        ...item, 
                        speaking_corr_cnt: 0, 
                        speaking_incorr_cnt: item.study_eng.split(" ").length,
                        speaking_timer: 0, 
                        transcribed: "" 
                    }));
                    setItemArray(initializedData);
                }
            } catch (err) { console.error("데이터 로드 에러:", err); }
        };

        const loadCSS = (file) => {
            const link = document.createElement("link");
            link.rel = "stylesheet"; 
            link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
            document.head.appendChild(link);
        };
        
        checkMobile();
        ["default.css", "content.css"].forEach(loadCSS);
        fetchAllData();
    }, [taskId]);

    // 2. 자동 스크롤 및 재생 제어
    useEffect(() => {
        currentItemNoRef.current = itemNo;
        if (!isIntro && itemArray.length > 0) {
            if (step === 1 && audioRef.current && itemNo < itemArray.length) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${itemArray[itemNo].study_mp3_file}`;
                audioRef.current.play().catch((e) => console.log("자동재생 대기"));
            }
            if (activeSentenceRef.current && scrollRef.current) {
                const container = scrollRef.current;
                const element = activeSentenceRef.current;
                const offset = isMobile ? 30 : 50;
                container.scrollTo({ top: element.offsetTop - container.offsetTop - offset, behavior: 'smooth' });
            }
        }
    }, [itemNo, step, isIntro, itemArray, isMobile]);

    const handleAudioEnded = () => {
        if (step === 1) {
            if (itemNo + 1 < itemArray.length) setItemNo(prev => prev + 1);
            else setShowNextBtn(true);
        }
    };

    // 3. 시각화 (Canvas)
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
                barHeight = dataArray[i] / 2;
                canvasCtx.fillStyle = `rgb(50, 150, ${barHeight + 100})`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        draw();
    };

    // 4. 녹음 핸들러
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
                    //await processAiAnalysis(blob);
                    await processBatchAnalysis(blob);
                    stream.getTracks().forEach(t => t.stop());
                    if (animationRef.current) cancelAnimationFrame(animationRef.current);
                };
                mediaRecorderRef.current.start();
                setIsRecording(true);
                timerRef.current = 0;
                timerIntervalRef.current = setInterval(() => { timerRef.current++; }, 1000);
            } catch (err) { alert("마이크를 확인해주세요."); }
        } else {
            if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    // 5. AI 분석 및 자동 이동 로직
    const processAiAnalysis = async (blob) => {
        setIsProcessing(true);
        const currentIdx = currentItemNoRef.current;
        const targetSentence = itemArray[currentIdx].study_eng;

        const formData = new FormData();
        formData.append('audio_file', new File([blob], 'record.wav'));
        formData.append('user_code', userId || 'guest');
        formData.append('branch_code', branchCode || 'base');
        formData.append('target_text', targetSentence);

        try {
            const res = await axios.post('/api/speaking/ai-analysis', formData);
            const { transcribed, ai_feedback } = res.data;

            setDebugTranscript(transcribed);
            setAiFeedback(ai_feedback);

            const updated = [...itemArray];
            updated[currentIdx].transcribed = transcribed;
            updated[currentIdx].speaking_corr_cnt = Math.round((ai_feedback.score / 100) * updated[currentIdx].speaking_incorr_cnt);
            updated[currentIdx].speaking_timer = timerRef.current;
            setItemArray(updated);

            if (currentIdx + 1 >= itemArray.length) {
                setIsProcessing(false);
                await calculateAndSave(updated); 
            } else {
                const nextIdx = currentIdx + 1;
                setItemNo(nextIdx);
                currentItemNoRef.current = nextIdx;
                setIsProcessing(false);
                setTimeout(() => toggleRecording(), 800); 
            }
        } catch (err) {
            alert("분석 에러 발생");
            setIsProcessing(false);
        }
    };

    // [로직 5 - 수정] 전체 통녹음 분석 로직
    const processBatchAnalysis = async (blob) => {
        setIsProcessing(true);
        
        const formData = new FormData();
        formData.append('audio_file', new File([blob], 'full_record.wav'));
        formData.append('user_code', userId || 'guest');
        formData.append('task_id', taskId);
        formData.append('branch_code', branchCode || 'base');
        // 학습해야 할 전체 문장 리스트를 보냅니다.
        formData.append('target_sentences', JSON.stringify(itemArray.map(i => i.study_eng)));

        try {
            // 새로 만든 Batch 엔드포인트 호출
            const res = await axios.post('/api/speaking/ai-analysis-batch', formData);
            const { analysis, file_name } = res.data;

            // 전체 분석 결과를 itemArray에 한꺼번에 매핑
            const updated = itemArray.map((item, idx) => {
                const match = analysis[idx] || {};
                return {
                    ...item,
                    transcribed: match.transcribed || "",
                    speaking_corr_cnt: Math.round(((match.score || 0) / 100) * item.speaking_incorr_cnt),
                    speaking_timer: Math.round(timerRef.current / itemArray.length) // 시간을 문장별로 분배
                };
            });

            setItemArray(updated);
            
            // 분석이 끝난 후 최종 저장 로직(save-report) 호출
            await calculateAndSave(updated); 
            
        } catch (err) {
            console.error(err);
            alert("전체 분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
        } finally {
            setIsProcessing(false);
        }
    };

    // 6. 결과 계산, 저장 및 최종 리포트 생성
    const calculateAndSave = async (finalArray) => {
        if (isSaved) return;

        let tCorr = 0, tWords = 0, tTime = 0;
        finalArray.forEach(item => {
            tCorr += item.speaking_corr_cnt; 
            tWords += item.speaking_incorr_cnt;
            tTime += item.speaking_timer; 
        });

        const wpm = Math.round((tWords / (tTime || 1)) * 60);
        const score = Math.round((tCorr / tWords) * 100);
        let grade = score < 60 ? "Bad" : score < 85 ? "Good" : "Excellent";
        const durationStr = `${Math.floor(tTime / 60)}:${(tTime % 60).toString().padStart(2, '0')}`;
        
        const result = { word: tWords, duration: durationStr, wpm, accuracy: grade };
        setFluencyResult(result);

        try {
            const summaryRes = await axios.post('/api/speaking/final-summary', { 
                results: finalArray.map(i => ({ study_eng: i.study_eng, transcribed: i.transcribed })) 
            });
            const feedback = summaryRes.data.summary;
            setOverallFeedback(feedback);

            const reportPayload = {
                task_id: parseInt(taskId),
                user_id: userId || 'guest',
                branch_code: branchCode || 'base',
                accuracy: grade,
                wpm: wpm,
                duration: durationStr,
                word_count: tWords,
                score: score,
                overall_feedback: feedback,
                details: finalArray.map(i => ({ 
                    study_eng: i.study_eng, 
                    transcribed: i.transcribed || "" 
                }))
            };

            const saveRes = await axios.post('/api/speaking/save-report', reportPayload);
            
            if (saveRes.data.result_code === "200") {
                setIsSaved(true);
                setShowReport(true);
            }
        } catch (err) {
            console.error("저장 실패:", err);
            alert("학습 결과 저장 중 오류가 발생했습니다.");
        }
    };

    const playReportSpeech = async () => {
        if (!overallFeedback || isPlayingTTS) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post('/api/speaking/tts', { text: overallFeedback }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const audio = new Audio(url);
            audio.onended = () => setIsPlayingTTS(false);
            audio.play();
        } catch (err) { 
            setIsPlayingTTS(false);
            console.error("TTS 에러"); 
        }
    };

    const handleForceNext = () => { setStep(2); setItemNo(0); setShowNextBtn(false); };

    if (!dayTaskView) return <div className="loading">Loading...</div>;

    return (
        <div id="eduwrap">
            <audio ref={audioRef} onEnded={handleAudioEnded} />
            
            {showReport && (
                <div style={reportModalOverlayStyle}>
                    <div style={reportContainerStyle}>
                        <div style={reportHeaderStyle}>
                            <h2 style={{margin:0, color:'#fff'}}>Speaking Report</h2>
                        </div>
                        <div style={{padding:'20px', flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
                            <div className="score_grid" style={scoreGridStyle}>
                                <div style={scoreItemStyle}><span>Accuracy</span><strong>{fluencyResult.accuracy}</strong></div>
                                <div style={scoreItemStyle}><span>WPM</span><strong>{fluencyResult.wpm}</strong></div>
                                <div style={scoreItemStyle}><span>Time</span><strong>{fluencyResult.duration}</strong></div>
                            </div>

                            <div style={reportScrollStyle}>
                                {itemArray.map((item, idx) => (
                                    <div key={idx} style={sentenceRowStyle}>
                                        <p style={{margin:'0 0 5px 0', color:'#555', fontSize:'13px'}}>🎯 {item.study_eng}</p>
                                        <p style={{margin:0, color:'#007bff', fontWeight:'bold'}}>🗣️ {item.transcribed || "..."}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={feedbackBoxStyle}>
                                <p style={{margin:'0 0 10px 0', fontWeight:'bold', color:'#333'}}>AI Teacher's Final Comment</p>
                                <p style={{margin:'0 0 15px 0', fontSize:'14px', lineHeight:'1.5'}}>{overallFeedback}</p>
                                <button onClick={playReportSpeech} disabled={isPlayingTTS} style={ttsButtonStyle}>
                                    {isPlayingTTS ? "재생 중..." : "AI 선생님 음성 듣기 🔊"}
                                </button>
                            </div>
                            
                            <button onClick={() => window.close()} style={closeButtonStyle}>학습 마치기</button>
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

            <div className="educontainer" style={{ background: "rgba(255,255,255,0.6)" }}>
                {isIntro ? (
                    <div className="agent-ipad" style={{display:'block'}}>
                        <div className="start_page">
                            <p className="t1">신나는 LUCID SPEAKING 학습을 시작할게요.</p>
                            <button type="button" onClick={() => setIsIntro(false)} style={{cursor:'pointer'}}>START</button>
                        </div>
                    </div>
                ) : (
                    <div className="agent-content">
                        <div className="conbox1">
                            <div className="speech">
                                <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                                <p className="bubble_tx">
                                    <span className="tx_box">
                                        {step === 1 ? "똑같은 속도로 문장을 읽어주세요." : "마이크를 클릭하고 문장을 읽어보세요."}
                                    </span>
                                </p>
                            </div>
                            <div className="numbox"><span>{Math.min(itemNo + 1, itemArray.length)}/{itemArray.length}</span></div>
                        </div>

                        <div className="conbox2" style={{minHeight: '400px'}}>
                            {step === 2 && (
                                <div className="divide2" style={{float:'right', width:'280px', marginLeft:'20px'}}>
                                    <div className="divide2_1">
                                        <div className="tit1">AI Analysis</div>
                                        <div className="txs">
                                            <div className="linetx"><p className="tx1">Accuracy</p><p className="tx2" style={{color:'blue'}}>{aiFeedback ? aiFeedback.score : '-'}%</p></div>
                                            <div className="linetx"><p className="tx1">My WPM</p><p className="tx2">{fluencyResult.wpm}</p></div>
                                            <div className="linetx"><p className="tx1">Result</p><p className="tx2">{fluencyResult.accuracy}</p></div>
                                        </div>
                                        {aiFeedback && (
                                            <div style={{marginTop:'10px', padding:'10px', background:'#e3f2fd', borderRadius:'10px', fontSize:'12px', border:'1px solid #bbdefb'}}>
                                                <strong>AI Tip:</strong> {aiFeedback.feedback}
                                            </div>
                                        )}
                                    </div>
                                    <canvas ref={canvasRef} width="280" height="80" style={{marginTop:'10px', borderRadius:'15px', background: '#202020', boxShadow: isRecording ? '0px 0px 10px #007bff' : 'none'}}></canvas>
                                </div>
                            )}

                            <div className="boxline he_long" ref={scrollRef} style={{overflowY: 'auto', height: '350px', width: step === 2 ? 'calc(100% - 300px)' : '100%', float:'left'}}>
                                <div className="boxtext longtx">
                                    {itemArray.map((item, index) => (
                                        <div key={index} ref={index === itemNo ? activeSentenceRef : null} className={index === itemNo ? "tx_blue tx_bold" : ""} style={{marginBottom: '10px'}}>
                                            {item.study_eng}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{clear:'both', background:'#f8f9fa', padding:'10px', fontSize:'11px', border:'1px solid #dee2e6', margin:'10px 0'}}>
                            <strong>[DEBUG]</strong> 인식: <span style={{color:'blue'}}>{debugTranscript || "..."}</span>
                        </div>

                        <div className="btns m_txcenter" style={{marginTop:'20px', clear:'both'}}>
                            <div className="btn_s_cen">
                                {step === 1 ? (
                                    <>
                                        <button type="button" className="btn_next" onClick={handleForceNext} style={{backgroundColor: '#ff9800', marginRight:'10px'}}>NEXT2 (TEST)</button>
                                        {showNextBtn && <button type="button" className="btn_next" onClick={() => {setStep(2); setItemNo(0); setShowNextBtn(false);}}>NEXT</button>}
                                    </>
                                ) : (
                                    <>
                                        {!isSaved ? (
                                            <button type="button" className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} onClick={toggleRecording} disabled={isProcessing}>
                                                <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="Mic" />
                                            </button>
                                        ) : (
                                            <button className="btn_return" onClick={() => setShowReport(true)}>VIEW REPORT</button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 인라인 스타일 정의 (원본 디테일 보존) ---
const reportModalOverlayStyle = { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', justifyContent:'center', alignItems:'center' };
const reportContainerStyle = { width:'500px', maxWidth:'95%', height:'90vh', background:'#fff', borderRadius:'20px', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 0 30px rgba(0,0,0,0.5)' };
const reportHeaderStyle = { background:'#007bff', padding:'20px', textAlign:'center' };
const scoreGridStyle = { display:'flex', justifyContent:'space-between', marginBottom:'20px' };
const scoreItemStyle = { textAlign:'center', flex:1, borderRight:'1px solid #eee' };
const reportScrollStyle = { flex:1, overflowY:'auto', padding:'15px', border:'1px solid #eee', borderRadius:'10px', marginBottom:'20px' };
const sentenceRowStyle = { borderBottom:'1px solid #f9f9f9', paddingBottom:'10px', marginBottom:'10px' };
const feedbackBoxStyle = { background:'#f8f9fa', padding:'15px', borderRadius:'10px', textAlign:'center', marginBottom:'20px' };
const ttsButtonStyle = { padding:'10px 20px', background:'#28a745', color:'#fff', border:'none', borderRadius:'50px', cursor:'pointer', fontWeight:'bold' };
const closeButtonStyle = { width:'100%', padding:'15px', background:'#6c757d', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'16px' };

export default SpeakingStudyPage;