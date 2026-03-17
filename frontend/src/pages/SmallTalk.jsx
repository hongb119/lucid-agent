import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SmallTalk = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code') || 'MAIN';
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = queryParams.get('re_study_no') || '0';

    // --- 상태 관리 (대표님 원본 100% 보존) ---
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState('READY'); 
    const [itemNo, setItemNo] = useState(0); 
    const [contents, setContents] = useState([]);
    const [dayTaskView, setDayTaskView] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [logs, setLogs] = useState([]);
    const [aiSummary, setAiSummary] = useState("");
    const [displayImg, setDisplayImg] = useState("/static/study/images/img_logo.png");
    const [isPlayingTTS, setIsPlayingTTS] = useState(false);
    const [userName, setUserName] = useState("");

    // --- 참조 관리 (대표님 원본 100% 보존) ---
    const itemNoRef = useRef(0); 
    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const currentAudioIdxRef = useRef(1);
    const timerRef = useRef(null);

    // 1. 초기 데이터 및 CSS 로드 (원본 보존)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`/api/smalltalk/info`, { 
                    params: { task_id: taskId, user_id: userId } 
                });
                setDayTaskView(res.data.task_info);
                setContents(res.data.content_list);
                setUserName(res.data.task_info.user_name || queryParams.get('user_name') || '학생');
            } catch (err) { console.error("데이터 로드 실패:", err); }
        };
        fetchData();

        const loadCSS = (file) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = `/static/study/css/${file}`;
            document.head.appendChild(link);
        };
        ["default.css", "content.css"].forEach(loadCSS);
        return () => { if(timerRef.current) clearTimeout(timerRef.current); };
    }, [taskId, userId]);

    // 2. 질문 재생 시퀀스
    const playAISequence = (targetIdx) => {
        if (!contents[targetIdx] || status === 'RESULT' || status === 'FINAL_SAVING') return;

        audioRef.current.pause();
        audioRef.current.onended = null; 
        audioRef.current.currentTime = 0;

        setStatus('PLAYING');
        const item = contents[targetIdx];
        setDisplayImg(`https://admin.lucideducation.co.kr/uploadDir/study/ai/${item.eng_img}`);
        
        currentAudioIdxRef.current = 1;
        const playNext = () => {
            if (status === 'RESULT' || status === 'FINAL_SAVING') return;
            const idx = currentAudioIdxRef.current;
            const fileField = `eng_mp3_${idx}`;
            
            if (idx <= 6 && item[fileField] && item[fileField] !== 'N') {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/tts/${item[fileField]}`;
                audioRef.current.onended = () => {
                    currentAudioIdxRef.current++;
                    playNext();
                };
                audioRef.current.play().catch(() => checkNextAction());
            } else {
                checkNextAction();
            }
        };
        playNext();
    };

    // [핵심] 재생 후 액션 결정 로직
    const checkNextAction = () => {
        const currentIdx = itemNoRef.current;
        // 가변 대응: 마지막 인덱스(엔딩 멘트)이면 저장 단계로!
        if (currentIdx === contents.length - 1) {
            finishStudy(logs);
        } else {
            startAutomaticRecording();
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            alert("음성 제한시간이 지났습니다.\n확인 버튼을 클릭해서 학습을 진행하여 주세요.");
            if (isRecording) handleRecording(); 
        }, 20000);
    };

    const startAutomaticRecording = () => {
        if (status === 'RESULT' || status === 'FINAL_SAVING') return;
        setStatus('SPEAKING');
        startTimer();
        setTimeout(() => handleRecording(true), 400);
    };

    const handleRecording = async (forceStart = false) => {
        if (isRecording && !forceStart) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                await sendToAI(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setStatus('SPEAKING');
            setIsRecording(false);
        }
    };

    const sendToAI = async (blob) => {
        setStatus('PROCESSING');
        const currentIdx = itemNoRef.current;
        const currentItem = contents[currentIdx];
        
        const formData = new FormData();
        formData.append('audio_file', blob);
        formData.append('correct_eng', currentItem.correct_eng || "");
        
        try {
            const res = await axios.post('/api/smalltalk/analyze', formData);
            const { transcribed, is_correct } = res.data;

            const newLog = {
                task_id: taskId, user_id: userId, branch_code: branchCode,
                ai_no: currentItem.ai_no, student_transcript: transcribed,
                result_status: is_correct ? 'CORRECT' : 'WRONG'
            };

            const updatedLogs = [...logs, newLog];
            setLogs(updatedLogs);

            const nextIdx = currentIdx + 1;
            itemNoRef.current = nextIdx;
            setItemNo(nextIdx);
            playAISequence(nextIdx);
        } catch (err) { setStatus('SPEAKING'); }
    };

    // [수정 핵심] 다운 현상 방지: 데이터 처리 후 '확실히' RESULT로 전환
    const finishStudy = async (finalLogs) => {
        if (status === 'RESULT' || status === 'FINAL_SAVING') return;
        setStatus('FINAL_SAVING'); // "리포트 만들고 있어..." 메시지 노출 시점
        
        try {
            const res = await axios.post('/api/smalltalk/complete', {
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, re_study_no: parseInt(reStudyNo) + 1,
                logs: finalLogs
            });

            // 데이터가 확실히 넘어왔을 때 summary 저장
            if (res.data) {
                setAiSummary(res.data.summary || "오늘도 훌륭하게 학습을 마쳤습니다!");
                
                // 마지막 엔딩 음성 재생
                const lastItem = contents[contents.length - 1];
                if (lastItem) {
                    audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/tts/${lastItem.eng_mp3_1}`;
                    audioRef.current.onended = () => {
                        // 음성 끝난 뒤 확실하게 RESULT로 변경
                        setStatus('RESULT');
                        if (window.opener && window.opener.fnReload) window.opener.fnReload();
                    };
                    audioRef.current.play();
                } else {
                    setStatus('RESULT');
                }
            }
        } catch (err) { 
            console.error("최종 저장 실패:", err);
            setStatus('RESULT'); // 에러 나더라도 화면은 넘겨줌
        }
    };

    const playSummaryTTS = async () => {
        if (isPlayingTTS) return;
        setIsPlayingTTS(true);
        try {
            const res = await axios.post('/api/smalltalk/tts', { text: aiSummary }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const audio = new Audio(url);
            audio.onended = () => setIsPlayingTTS(false);
            audio.play();
        } catch (err) { setIsPlayingTTS(false); }
    };

    if (!dayTaskView) return null;

    // --- UI 영역 (대표님 원본 100% 보존) ---
    return (
        <div id="eduwrap">
            <div className="eduhead">
                <div className="hd_info">
                    <p>학습자 : <b>{userName} ({userId})</b></p>
                    <p>교재명 : <span>{dayTaskView.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit {dayTaskView.study_unit}</span></p>
                </div>
            </div>

            <div className="educontainer" style={{ background: "rgba(255,255,255,0.7)", borderRadius:'15px' }}>
                {step === 1 ? (
                    <div className="start_page">
                        <p className="t1">신나는 LUCID SMALL TALK 학습을 시작할게요.</p>
                        <p className="t2">원어민 선생님의 질문을 잘 듣고 큰 소리로 대답해 보세요!</p>
                        <button type="button" onClick={() => {setStep(2); setStatus('READY');}}>START</button>
                    </div>
                ) : (
                    <div className="educontainer">
                        <div className="conbox1">
                            <div className="speech">
                                <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                                <p className="bubble_tx">
                                    <span className="tx_box">
                                        {status === 'READY' ? (
                                            <>첨단 인공지능 루아이는 <b>{userName}</b>학생의 친구에요.<br/>빨간색 마이크가 보이면 루아이의 질문에 대답하세요.</>
                                        ) : status === 'PROCESSING' ? (
                                            "루아이가 대답을 분석하고 있어요. 잠시만 기다려줘! ⏳"
                                        ) : status === 'FINAL_SAVING' ? (
                                            "오늘 대화를 정리해서 리포트를 만들고 있어... ✨"
                                        ) : status === 'RESULT' ? (
                                            "루아이 선생님의 리포트가 도착했어! 확인을 눌러줘."
                                        ) : isRecording ? (
                                            "루아이가 듣고 있어! 대답이 끝나면 마이크를 눌러줘."
                                        ) : status === 'SPEAKING' ? (
                                            "지금 바로 루아이에게 대답해봐!"
                                        ) : "루아이의 질문을 잘 들어봐!"}
                                    </span>
                                </p>
                            </div>
                            <div className="numbox"><span>{status === 'RESULT' ? contents.length : (itemNo + 1)}/{contents.length}</span></div>
                        </div>

                        <div className="conbox2">
                            {status === 'RESULT' ? (
                                <div className="boxline boxlong_w" style={{padding:'20px', background:'#f8f9fa', borderRadius:'15px', textAlign:'center'}}>
                                    <h3 style={{color:'#007bff', marginBottom:'15px'}}>AI 선생님의 총평 리포트</h3>
                                    <p style={{lineHeight:'1.8', fontSize:'16px', marginBottom:'20px'}}>{aiSummary}</p>
                                    <div style={{display:'flex', justifyContent:'center', gap:'10px'}}>
                                        <button onClick={playSummaryTTS} disabled={isPlayingTTS} style={{padding:'10px 20px', background:'#007bff', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                                            {isPlayingTTS ? "재생 중..." : "리포트 듣기 🔊"}
                                        </button>
                                        <button onClick={() => window.close()} style={{padding:'10px 20px', background:'#28a745', color:'#fff', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                                            학습 완료 확인 ✔
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="boxline boxlong_w">
                                    <div className="imgw100">
                                        <img src={displayImg} alt="AI" style={{borderRadius:'15px', maxWidth:'400px'}} 
                                             onError={(e) => e.target.src="/static/study/images/img_logo.png"} />
                                        {status === 'READY' && <p className="tx1">아래 빨간색 마이크를 클릭해서 대화를 시작 하세요.</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="btns m_txcenter" style={{ marginTop: '20px' }}>
                            <div className="btn_s_cen">
                                {status === 'READY' && (
                                    <button type="button" className="ch_btn" onClick={() => playAISequence(0)}>
                                        <img src="/static/study/images/btn_s01.png" alt="시작" />
                                    </button>
                                )}
                                {(status === 'PLAYING' || status === 'PROCESSING' || status === 'FINAL_SAVING') && (
                                    <button type="button" className="ch_btn">
                                        <img src="/static/study/images/btn_s03.png" className="ani_btn" alt="대기" />
                                    </button>
                                )}
                                {status === 'SPEAKING' && (
                                    <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                                        <button type="button" className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} onClick={() => handleRecording()}>
                                            <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="마이크" />
                                        </button>
                                        <p style={{color: isRecording ? '#e91e63' : '#007bff', fontWeight:'bold', marginTop:'10px'}}>
                                            {isRecording ? "● REC - 대답이 끝나면 클릭" : "다시 대답하려면 마이크 클릭"}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="fr_btn">
                                <button type="button" className="btn_finish" onClick={() => window.close()}>
                                    FINISH <span><img src="/static/study/images/btn_s08.png" alt="종료" /></span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmallTalk;