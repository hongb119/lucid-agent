import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AgentContext } from '../App';
import SmallTalkReport from './SmallTalkReport';

const SmallTalk = () => {
    const { triggerAgent } = useContext(AgentContext);
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code') || 'MAIN';
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = queryParams.get('re_study_no') || '0';

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

    const itemNoRef = useRef(0); 
    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const currentAudioIdxRef = useRef(1);
    const timerRef = useRef(null);

    // 1. 초기 로드
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
        return () => { if(timerRef.current) clearTimeout(timerRef.current); audioRef.current.pause(); };
    }, [taskId, userId]);

    // 🚀 학습 시작 (에이전트 호출 및 첫 질문 재생)
    const handleStartStudy = () => {
        setStep(2);
        setStatus('READY');

        if (triggerAgent) {
            triggerAgent({
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, task_type: 'smalltalk'
            });
        }
        // 버튼 클릭 후 첫 번째 AI 음성 바로 시작
        playAISequence(0); 
    };

    // 2. AI 질문 재생 시퀀스 (원본 로직 복구)
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
                checkNextAction(); // 모든 음성 재생 후 녹음으로 이동
            }
        };
        playNext();
    };

    // 3. 재생 완료 후 다음 액션 결정
    const checkNextAction = () => {
        const currentIdx = itemNoRef.current;
        if (currentIdx === contents.length - 1) {
            finishStudy(logs); // 마지막 인덱스면 종료 저장
        } else {
            startAutomaticRecording(); // 중간이면 자동 녹음 시작
        }
    };

    const startAutomaticRecording = () => {
        if (status === 'RESULT' || status === 'FINAL_SAVING') return;
        setStatus('SPEAKING');
        // 20초 제한 타이머 시작
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            if (isRecording) handleRecording(); 
        }, 20000);
        
        setTimeout(() => handleRecording(true), 400); // 0.4초 후 자동 녹음 시작
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
    
    // 1. 현재 질문 정보 가져오기 (Ref 사용으로 정확한 인덱스 유지)
    const currentIdx = itemNoRef.current;
    const currentItem = contents[currentIdx];
    
    // 2. 서버 전송용 데이터 구성
    const formData = new FormData();
    formData.append('audio_file', blob);
    formData.append('correct_eng', currentItem.correct_eng || "");
    // correct_except가 있다면 추가 (파닉스 대비)
    if(currentItem.correct_except) formData.append('correct_except', currentItem.correct_except);
    
    try {
        // 3. AI 분석 요청
        const res = await axios.post('/api/smalltalk/analyze', formData);
        const { transcribed, is_correct } = res.data;

        // 4. ⭐ [핵심] 로그 데이터 생성 (리포트용 질문 텍스트 포함)
        const newLog = {
            task_id: taskId,
            user_id: userId,
            branch_code: branchCode,
            ai_no: currentItem.ai_no,
            // 🚀 질문 원문을 추가해야 리포트가 풍성해집니다.
            question_text: currentItem.correct_eng || "RUAI's Question", 
            student_transcript: transcribed || "(No Response)",
            result_status: is_correct ? 'CORRECT' : 'WRONG'
        };

        // 5. 🚀 [필독] 이전 로그에 새 로그를 누적 (함수형 업데이트 방식)
        // 이렇게 해야 logs 배열이 Q1, Q2, Q3... 차곡차곡 쌓입니다.
        setLogs(prevLogs => [...prevLogs, newLog]);

        // 6. 다음 질문으로 이동
        const nextIdx = currentIdx + 1;
        itemNoRef.current = nextIdx;
        setItemNo(nextIdx);
        
        // 약간의 딜레이 후 다음 질문 재생 (사용자 편의성)
        setTimeout(() => {
            playAISequence(nextIdx);
        }, 500);

    } catch (err) {
        console.error("AI 분석 실패:", err);
        alert("분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
        setStatus('SPEAKING'); // 에러 시 다시 말하기 상태로 복구
    }
    };
    const finishStudy = async (finalLogs) => {
        if (status === 'RESULT' || status === 'FINAL_SAVING') return;
        setStatus('FINAL_SAVING');
        
        try {
            const res = await axios.post('/api/smalltalk/complete', {
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, re_study_no: parseInt(reStudyNo) + 1,
                logs: finalLogs
            });

            if (res.data) {
                setAiSummary(res.data.summary);
                const lastItem = contents[contents.length - 1];
                if (lastItem) {
                    audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/tts/${lastItem.eng_mp3_1}`;
                    audioRef.current.onended = () => {
                        setStatus('RESULT');
                        if (window.opener && window.opener.fnReload) window.opener.fnReload();
                    };
                    audioRef.current.play();
                } else { setStatus('RESULT'); }
            }
        } catch (err) { setStatus('RESULT'); }
    };

    if (!dayTaskView) return null;

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
                        <button type="button" onClick={handleStartStudy}>START</button>
                    </div>
                ) : (
                    <div className="educontainer">
                        <div className="conbox1">
                            <div className="speech">
                                <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                                <p className="bubble_tx">
                                    <span className="tx_box">
                                        {status === 'READY' ? "마이크 버튼을 눌러 루아이와 대화를 시작하세요!" :
                                         status === 'PLAYING' ? "루아이의 질문을 잘 들어보세요. 🔊" :
                                         status === 'PROCESSING' ? "루아이가 대답을 분석하고 있어요. ⏳" :
                                         status === 'FINAL_SAVING' ? "오늘의 대화를 정리 중이에요... ✨" :
                                         status === 'RESULT' ? "루아이의 리포트가 도착했습니다!" :
                                         isRecording ? "루아이가 듣고 있어요! 대답이 끝나면 마이크를 눌러주세요." :
                                         status === 'SPEAKING' ? "지금 바로 대답해 보세요!" : "잠시만 기다려주세요."}
                                    </span>
                                </p>
                            </div>
                            <div className="numbox"><span>{status === 'RESULT' ? contents.length : (itemNo + 1)}/{contents.length}</span></div>
                        </div>

                        <div className="conbox2">
                            {status === 'RESULT' ? (
                                <SmallTalkReport 
                                    summary={aiSummary} 
                                    logs={logs} 
                                    userName={userName} 
                                    onClose={() => window.close()} 
                                />
                            ) : (
                                <div className="boxline boxlong_w">
                                    <div className="imgw100">
                                        <img src={displayImg} alt="AI" style={{borderRadius:'15px', maxWidth:'400px'}} 
                                             onError={(e) => e.target.src="/static/study/images/img_logo.png"} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {status !== 'RESULT' && (
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
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmallTalk;