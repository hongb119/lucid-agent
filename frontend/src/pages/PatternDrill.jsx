import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatternDrill = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code') || 'MAIN';
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = parseInt(queryParams.get('re_study_no') || '0');

    // --- 상태 관리 ---
    const [mode, setMode] = useState('START'); 
    const [itemNo, setItemNo] = useState(0);
    const [contents, setContents] = useState([]);
    const [taskInfo, setTaskInfo] = useState(null);
    const [logs, setLogs] = useState([]); 

    const [playCnt, setPlayCnt] = useState(1); 
    const [isPlaying, setIsPlaying] = useState(false); 
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false); 
    const [unscrambleQuiz, setUnscrambleQuiz] = useState([]); 
    const [unscrambleInput, setUnscrambleInput] = useState([]); 
    const [aiSummary, setAiSummary] = useState("");
    const [feedback, setFeedback] = useState(null); 
    const [unscrambleStats, setUnscrambleStats] = useState({ correct: 0, wrong: 0 });

    const audioRef = useRef(new Audio());
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await axios.get(`/api/patterndrill/info`, { params: { task_id: taskId } });
                setContents(res.data.content_list);
                setTaskInfo(res.data.task_info);
                
                ["default.css", "content.css"].forEach(file => {
                    const link = document.createElement("link");
                    link.rel = "stylesheet"; 
                    link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                    document.head.appendChild(link);
                });
            } catch (err) { console.error("데이터 로드 실패"); }
        };
        init();
        audioRef.current.onended = () => setIsPlaying(false);
    }, [taskId]);

    const playAudio = (file) => {
        if (!file) return;
        setIsPlaying(true);
        audioRef.current.pause(); // 새 소리 재생 전 기존 소리 중단
        audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${file}`;
        audioRef.current.play().catch(() => setIsPlaying(false));
    };

    // --- 1. FLASHCARD 핵심 로직 ---
    const startFlashcard = (idx) => {
        setMode('FLASHCARD');
        setItemNo(idx);
        setPlayCnt(1); // 다음 문장으로 갈 때 무조건 1단계(이미지)로 리셋
        playAudio(contents[idx].study_mp3_file);
    };

    // [기능 A] 중앙 카드 클릭 시: 현재 문장 안에서 단계 전환 (이미지 -> 영어 -> 한글)
    const handleCardStepClick = (e) => {
        if (e) e.stopPropagation();
        if (isPlaying) return; 

        if (playCnt < 3) {
            setPlayCnt(prev => prev + 1); 
            playAudio(contents[itemNo].study_mp3_file);
        } else {
            // 3단계(한글)일 때 클릭하면 편의상 다음 문장으로
            handleNextSentence();
        }
    };

    // [기능 B] 하단 NEXT 버튼 클릭 시: 무조건 "다음 문장"으로 이동
    const handleNextSentence = (e) => {
        if (e) e.stopPropagation();
        if (isPlaying) return; 
        
        if (itemNo + 1 < contents.length) {
            startFlashcard(itemNo + 1); // 문장 번호 증가 및 단계 1로 리셋
        } else {
            // 마지막 문장이면 스피킹 드릴 모드로 진입
            setItemNo(0);
            setMode('DRILL'); 
        }
    };

    // --- 2. DRILL (Speaking) ---
    const handleStartMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                setIsProcessing(true);
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio_file', audioBlob);
                formData.append('target_text', contents[itemNo].study_eng);
                try {
                    const res = await axios.post('/api/patterndrill/analyze-speaking', formData);
                    const newLog = {
                        study_item_no: contents[itemNo].study_item_no,
                        student_transcript: res.data.transcribed,
                        is_speaking_correct: res.data.is_correct,
                        unscramble_input: "",
                        is_unscramble_correct: false
                    };
                    const updatedLogs = [...logs, newLog];
                    setLogs(updatedLogs);
                    if (itemNo + 1 < contents.length) {
                        setItemNo(itemNo + 1);
                        setIsProcessing(false);
                    } else {
                        handleSaveAndReport(updatedLogs);
                    }
                } catch (err) { setIsProcessing(false); }
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) { alert("마이크 권한을 허용해주세요."); }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    };

    const handleSaveAndReport = async (finalLogs) => {
        try {
            const res = await axios.post('/api/patterndrill/complete', {
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, re_study_no: reStudyNo + 1, logs: finalLogs
            });
            setAiSummary(res.data.summary);
            setIsProcessing(false);
            setMode('REPORT');
        } catch (err) { setIsProcessing(false); }
    };

    // --- 3. UNSCRAMBLE ---
    const startUnscramble = () => {
        setItemNo(0);
        setUnscrambleStats({ correct: 0, wrong: 0 }); 
        setMode('UNSCRAMBLE');
        initUnscramble(0);
    };

    const initUnscramble = (idx) => {
        setFeedback(null);
        const text = contents[idx].study_unscramble || contents[idx].study_eng;
        const words = text.replace(/\[\[|\]\]/g, '').split(' ').sort(() => Math.random() - 0.5);
        setUnscrambleQuiz(words);
        setUnscrambleInput([]);
        playAudio(contents[idx].study_mp3_file);
    };

    const handleWordClick = (word, idx) => {
        if (feedback) return;
        setUnscrambleInput(prev => [...prev, word]);
        setUnscrambleQuiz(prev => prev.filter((_, i) => i !== idx));
    };

    const handleUnscrambleSubmit = () => {
        const inputStr = unscrambleInput.join(' ');
        const isCorrect = inputStr.toLowerCase().replace(/[.?!]/g, '') === contents[itemNo].study_eng.toLowerCase().replace(/[.?!]/g, '');
        
        setUnscrambleStats(prev => ({
            ...prev,
            correct: isCorrect ? prev.correct + 1 : prev.correct,
            wrong: !isCorrect ? prev.wrong + 1 : prev.wrong
        }));

        setFeedback(isCorrect ? 'CORRECT' : 'WRONG');

        setTimeout(() => {
            const updatedLogs = logs.map((log, idx) => idx === itemNo ? { ...log, unscramble_input: inputStr, is_unscramble_correct: isCorrect } : log);
            setLogs(updatedLogs);

            if (itemNo + 1 < contents.length) {
                setItemNo(itemNo + 1);
                initUnscramble(itemNo + 1);
            } else {
                setMode('RESULT'); 
            }
        }, 1200);
    };

    if (!taskInfo || contents.length === 0) return null;

    return (
        <div id="eduwrap">
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재 : <span>{taskInfo.study_step2_name}</span></p>
                    <p>학습 : <span>Unit {taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={mode === 'FLASHCARD' ? 'on' : ''}><a>FLASHCARD</a></li>
                    <li className={['DRILL', 'REPORT'].includes(mode) ? 'on' : ''}><a>PATTERN DRILLS</a></li>
                    <li className={mode === 'UNSCRAMBLE' ? 'on' : ''}><a>UNSCRAMBLE</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ background: mode === 'START' ? "rgba(255,255,255,0.6)" : "none" }}>
                
                {mode === 'START' && (
                    <div className="start_page">
                        <div className="boxline boxlong_w">
                            <div className="imgw100">
                                <img src="/static/study/images/img_logo.png" alt="Intro" style={{maxWidth:'300px', marginBottom:'20px'}} />
                                <p className="t1">LUCID PATTERN DRILL 학습을 시작합니다.</p>
                                <button type="button" onClick={() => startFlashcard(0)} style={{marginTop:'30px'}}>START</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FLASHCARD 모드: 이미지 전환 이슈 해결 버전 */}
                {mode === 'FLASHCARD' && (
                    <div className="conbox-flex">
                        <div className="conbox1">
                            <div className="speech">
                                <p className="bubble_tx">
                                    <span className="tx_box">
                                        중앙 카드를 클릭하면 단계별로 학습하며, 하단 NEXT를 누르면 다음 문장으로 넘어갑니다.
                                    </span>
                                </p>
                            </div>
                            <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
                        </div>
                        
                        {/* 카드 영역: playCnt 상태에 따라 조건부 렌더링 + key 부여로 강제 갱신 */}
                        <div className="conbox2" onClick={handleCardStepClick} style={{cursor: isPlaying ? 'wait' : 'pointer'}}>
                            <div className="boxline imgnoline">
                                <div className="boxtext">
                                    <div className="boximgw" style={{minHeight:'350px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                                        {playCnt === 1 && (
                                            <img key={`img-${itemNo}`} src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${contents[itemNo].study_img_file}`} alt="study" style={{maxHeight:'300px'}} />
                                        )}
                                        {playCnt === 2 && (
                                            <div key={`en-${itemNo}`} style={{textAlign:'center', padding:'20px'}}>
                                                <span style={{fontSize:'48px', fontWeight:'bold', color:'#2c3e50', wordBreak:'keep-all'}}>{contents[itemNo].study_eng}</span>
                                            </div>
                                        )}
                                        {playCnt === 3 && (
                                            <div key={`ko-${itemNo}`} style={{textAlign:'center', padding:'20px'}}>
                                                <span style={{fontSize:'48px', fontWeight:'bold', color:'#e91e63', wordBreak:'keep-all'}}>{contents[itemNo].study_kor}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="btns m_txcenter" style={{marginTop:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'15px'}}>
                            <div style={{display:'flex', gap:'10px'}}>
                                {[1, 2, 3].map(n => <button key={n} className={`numbtn ${playCnt === n ? 'on' : ''}`}>{n}</button>)}
                            </div>
                            
                            <button 
                                className="go_btn" 
                                onClick={handleNextSentence} 
                                disabled={isPlaying} 
                                style={{width:'250px', background: isPlaying ? '#ccc' : '#007bff'}}
                            >
                                {itemNo + 1 < contents.length ? "NEXT SENTENCE ▶▶" : "START DRILL 🚀"}
                            </button>
                        </div>
                    </div>
                )}

                {/* DRILL, REPORT, UNSCRAMBLE, RESULT 로직 보존 */}
                {mode === 'DRILL' && (
                    <div className="conbox-flex">
                        <div className="conbox1">
                            <div className="speech"><p className="bubble_tx"><span className="tx_box">{isProcessing ? "AI 분석 중..." : "마이크를 눌러 문장을 읽으세요."}</span></p></div>
                            <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
                        </div>
                        <div className="conbox2" style={{textAlign:'center', padding:'40px 0'}}>
                            {isProcessing ? <div className="spinner"></div> : <div className="boxline"><div className="boxtext smsize" style={{fontSize:'32px'}}>{contents[itemNo].study_eng}</div></div>}
                        </div>
                        {!isProcessing && (
                            <div className="btns m_txcenter">
                                {!isRecording ? (
                                    <button className="ch_btn" onClick={handleStartMic}><img src="/static/study/images/btn_s01.png" alt="start" /></button>
                                ) : (
                                    <button className="ch_btn ani_btn" onClick={stopRecording}><img src="/static/study/images/btn_s09.png" alt="stop" /></button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {mode === 'REPORT' && (
                    <div className="result_page" style={{textAlign:'center', padding:'30px'}}>
                        <div className="report_card" style={{background:'#fff', padding:'40px', borderRadius:'25px', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
                            <h3 style={{color:'#007bff'}}>Speaking Report</h3>
                            <p style={{fontSize:'20px', margin:'20px 0', lineHeight:'1.6'}}>{aiSummary}</p>
                            <button className="go_btn" onClick={startUnscramble} style={{width:'250px'}}>UNSCRAMBLE START</button>
                        </div>
                    </div>
                )}

                {mode === 'UNSCRAMBLE' && (
                    <div className="conbox-flex">
                        <div className="conbox1">
                            <div className="speech"><p className="bubble_tx"><span className="tx_box">단어를 터치해서 문장을 완성하세요!</span></p></div>
                            <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
                        </div>
                        <div className={`conbox9 ${feedback}`}>
                            <div className="cbox9">
                                <div className="textr">
                                    <div className="line1" style={{minHeight:'90px', padding:'10px', display:'flex', flexWrap:'wrap', gap:'10px', background: feedback==='CORRECT'?'#e3f2fd':feedback==='WRONG'?'#ffebee':'#f9f9f9', borderRadius:'10px'}}>
                                        {unscrambleInput.map((w, i) => <span key={i} className="txbtn2 on" style={{fontSize:'22px', padding:'10px 20px', display:'inline-block'}}>{w}</span>)}
                                        {unscrambleInput.length > 0 && !feedback && <button className="go_btn" onClick={handleUnscrambleSubmit}>GO</button>}
                                    </div>
                                    <div className="line2" style={{padding:'25px', display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center'}}>
                                        {unscrambleQuiz.map((w, i) => <button key={i} className="txbtn2" onClick={() => handleWordClick(w, i)} style={{fontSize:'22px'}}>{w}</button>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'RESULT' && (
                    <div className="result_page" style={{textAlign:'center', padding:'50px'}}>
                        <div className="boxline boxlong_w" style={{background:'#fff', padding:'40px', borderRadius:'30px', border:'2px solid #007bff'}}>
                            <img src="/static/study/images/img_logo.png" alt="Finish" style={{maxWidth:'180px', marginBottom:'20px'}} />
                            <h2 style={{fontSize:'28px', color:'#333', marginBottom:'20px'}}>언스크램블 결과</h2>
                            <div style={{display:'flex', justifyContent:'center', gap:'30px', marginBottom:'30px'}}>
                                <div style={{background:'#e3f2fd', padding:'20px', borderRadius:'15px', width:'150px'}}>
                                    <p style={{color:'#2196f3'}}>맞음</p>
                                    <p style={{fontSize:'32px', fontWeight:'bold'}}>{unscrambleStats.correct}</p>
                                </div>
                                <div style={{background:'#ffebee', padding:'20px', borderRadius:'15px', width:'150px'}}>
                                    <p style={{color:'#f44336'}}>틀림</p>
                                    <p style={{fontSize:'32px', fontWeight:'bold'}}>{unscrambleStats.wrong}</p>
                                </div>
                            </div>
                            <div style={{display:'flex', justifyContent:'center', gap:'15px'}}>
                                <button onClick={() => setMode('START')} style={{background:'#6c757d', color:'#fff', padding:'15px 40px', borderRadius:'50px', fontSize:'18px', border:'none', cursor:'pointer'}}>다시하기</button>
                                <button onClick={() => window.close()} style={{background:'#007bff', color:'#fff', padding:'15px 40px', borderRadius:'50px', fontSize:'18px', border:'none', cursor:'pointer'}}>학습 종료</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .txbtn2 { width: auto !important; min-width: 60px; height: auto !important; white-space: nowrap; cursor: pointer; }
            `}</style>
        </div>
    );
};

export default PatternDrill;