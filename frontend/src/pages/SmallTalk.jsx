import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AgentContext } from '../App';
import SmallTalkReport from './SmallTalkReport';
import SmallTalk_intro from './SmallTalk_intro';

const SmallTalk = () => {
    const { triggerAgent } = useContext(AgentContext);
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code') || 'MAIN';
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = queryParams.get('re_study_no') || '0';

    const [mode, setMode] = useState('START'); 
    const [status, setStatus] = useState('READY'); 
    const [itemNo, setItemNo] = useState(0); 
    const [contents, setContents] = useState([]);
    const [taskInfo, setTaskInfo] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [logs, setLogs] = useState([]);
    const [aiSummary, setAiSummary] = useState("");
    const [displayImg, setDisplayImg] = useState("/static/study/images/img_logo.png");
    const [loading, setLoading] = useState(true);
    // [추가] 1. 권한 상태 저장 (초기값은 prompt: 아직 묻지 않음)
    const [micPermission, setMicPermission] = useState('prompt');

    // Refs
    const itemNoRef = useRef(0); 
    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const currentAudioIdxRef = useRef(1);
    const timerRef = useRef(null); // 20초 타이머용

    const stopAllAudio = () => {
        const audio = audioRef.current;
        audio.pause();
        audio.onended = null;
        audio.src = ""; 
        audio.load();
    };

    // --- [추가] 공통 리셋 로직 ---
    const resetToStart = () => {
        // 1. 모든 오디오 및 타이머 즉시 정지
        stopAllAudio();
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        // 2. 녹음 관련 상태 강제 종료
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null; // 리셋 중 분석 방지
            mediaRecorderRef.current.stop();
        }

        // 3. 모든 상태값 초기화
        setIsRecording(false);
        setIsProcessing(false);
        setStatus('READY');
        
        // 🚩 중요: Ref와 State를 동시에 0으로 맞춤
        itemNoRef.current = 0;
        setItemNo(0);
        
        setLogs([]);
        setAiSummary("");
        
        console.log("🔄 스몰토크 리셋: 1번 문항부터 다시 시작합니다.");

        // 4. 리액트가 렌더링을 마칠 시간을 준 뒤(0.3초), 첫 번째 AI 질문 시작
        setTimeout(() => {
            // mode가 START일 수도 있으므로 STUDY로 강제 전환 후 시작
            setMode('STUDY');
            playAISequence(0, []); 
        }, 300);
    };

    // [추가] 2. 권한 모니터링 함수 정의
    const monitorMicPermission = async () => {
      if (navigator.permissions && navigator.permissions.query) {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            setMicPermission(result.state); // 현재 상태 반영 (granted, denied, prompt)

            // 사용자가 주소창에서 권한을 바꾸면 실시간으로 감지
            result.onchange = () => {
                setMicPermission(result.state);
            };
        } catch (e) {
            console.warn("Permission API를 지원하지 않는 브라우저입니다.");
        }
      }
    };

    // --- [수정] 에러 발생 시 종료 대신 첫 문항으로 리셋 ---
    const handleError = (errorName) => {
        setIsRecording(false);
        let userMessage = "마이크 초기화에 실패했습니다.";

        switch (errorName) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                userMessage = "마이크 권한이 거부되었습니다.\n주소창의 자물쇠 아이콘을 눌러 허용으로 변경해 주세요.";
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                userMessage = "연결된 마이크를 찾을 수 없습니다.";
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                userMessage = "마이크가 다른 프로그램(줌, 카톡 등)에서 사용 중입니다.";
                break;
            default:
                console.error("Recording Error:", errorName);
        }

        // 🚩 [수정] 종료 대신 알림 후 첫 문항으로 리셋
        alert(`${userMessage}\n\n마이크 설정 확인 후 처음부터 다시 학습을 시작합니다.`);
        //handleRetry();
        window.location.reload();
        //resetToStart();
    };

    // --- [추가] 1. 다시 시작하기 (Retry) 로직 ---
    const handleRetry = () => {
        if (window.confirm("학습을 처음부터 다시 시작할까요?")) {
            // 모든 상태값 초기화
            stopAllAudio();
            if (timerRef.current) clearTimeout(timerRef.current);
            
            setMode('STUDY');      // 다시 학습 모드로
            setStatus('READY');    // 준비 상태로
            setItemNo(0);          // 첫 문항으로
            itemNoRef.current = 0; // 레프값도 초기화
            setLogs([]);           // 로그 초기화
            setAiSummary("");      // 요약 초기화
            
            // 처음부터 다시 대화 시작
            setTimeout(() => playAISequence(0, []), 500);
        }
    };

    // --- [추가] 오디오 데시벨 분석 함수 (컴포넌트 내부에 배치) ---
    const getAverageDecibels = async (blob) => {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const tempCtx = new AudioContext();
            const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
            const rawData = audioBuffer.getChannelData(0);
            
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
            return -100;
        }
    };

    useEffect(() => {
        const init = async () => {
            monitorMicPermission(); // 여기서 권한 체크 시작!
            try {
                const res = await axios.get(`/api/smalltalk/info`, { 
                    params: { task_id: taskId, user_id: userId } 
                });
                setContents(res.data.content_list);
                setTaskInfo(res.data.task_info);

                ["default.css", "content.css"].forEach(file => {
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                    document.head.appendChild(link);
                });
            } catch (err) {
                console.error("Data Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => {
            if(timerRef.current) clearTimeout(timerRef.current);
            stopAllAudio();
        };
    }, [taskId, userId]);

    const handleStartStudy = () => {
        setMode('STUDY');
        setStatus('READY');
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, task_type: 'smalltalk'
            });
        }
        playAISequence(0, []); 
    };

    const playAISequence = (targetIdx, currentLogs = []) => {
        // targetIdx가 0일 때도 정상 작동하도록 체크 강화
        if (!contents || !contents[targetIdx] || mode === 'RESULT') return;

        stopAllAudio();
        setStatus('PLAYING');
        
        const item = contents[targetIdx];
        if (!item) return;

        setDisplayImg(`https://admin.lucideducation.co.kr/uploadDir/study/ai/${item.eng_img}`);
        
        const isLastItem = targetIdx === contents.length - 1;
        currentAudioIdxRef.current = 1;

        const playNext = () => {
            // 🚩 리셋 등으로 인해 targetIdx가 현재 참조와 다르면 중단
            if (itemNoRef.current !== targetIdx) return; 

            const idx = currentAudioIdxRef.current;
            const fileField = `eng_mp3_${idx}`;
            
            if (item[fileField] && item[fileField] !== 'N') {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/tts/${item[fileField]}`;
                audioRef.current.onended = () => {
                    currentAudioIdxRef.current++;
                    playNext();
                };
                audioRef.current.play().catch((e) => {
                    console.warn("오디오 재생 실패 (무시하고 진행):", e);
                    if (isLastItem) finishStudy(currentLogs);
                    else startAutomaticRecording(currentLogs);
                });
            } else {
                if (isLastItem) finishStudy(currentLogs);
                else startAutomaticRecording(currentLogs); 
            }
        };
        playNext();
    };

    // [로직 추가] 20초 타이머 시작
    const startAutomaticRecording = (currentLogs) => {
        setStatus('SPEAKING');
        
        // 기존 타이머가 있다면 제거
        if (timerRef.current) clearTimeout(timerRef.current);

        // 20초 후 실행될 타임아웃 설정
        timerRef.current = setTimeout(() => {
            // 여전히 말하기 상태이거나 녹음 중일 때만 작동
            stopRecordingAndSkip(currentLogs);
        }, 20000); 

        setTimeout(() => handleRecording(currentLogs, true), 400); 
    };

    // [로직 추가] 응답 없음 처리 및 강제 넘김
    const stopRecordingAndSkip = (currentLogs) => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = null; // 분석 방지
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (timerRef.current) clearTimeout(timerRef.current);

        // 멘트 표시 상태로 변경 (사용자 피드백)
        setStatus('TIMEOUT'); 
        
        // 1.5초 정도 멘트를 보여준 후 다음으로 넘김
        setTimeout(() => {
            recordLogAndProceed("(No Response)", false, currentLogs);
        }, 1500);
    };

    // [수정] handleRecording 내 예외 처리 (종료 로직 제거 및 리셋 연동)
    const handleRecording = async (currentLogs, forceStart = false) => {
        if (isRecording && !forceStart) {
            if (mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
            });

            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // 1단계: 용량/데시벨 체크
                if (blob.size < 2000) { 
                    alert("음성이 감지되지 않았습니다. 다시 시작합니다.");
                    resetToStart();
                    return; 
                }

                setStatus('PROCESSING');
                const avgDb = await getAverageDecibels(blob);
                if (avgDb < -45) {
                    alert("소리가 너무 작습니다. 설정 확인 후 다시 시작합니다.");
                    resetToStart();
                    return;
                }

                // 🚩 분리된 분석 함수 호출
                handleAnalyze(blob, currentLogs);

                // 스트림 종료
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatus('SPEAKING');

        } catch (err) {
            handleError(err.name); 
        }
    };

    // 🚩 [새로 추가] 스몰토크 전용 분석 함수
    const handleAnalyze = async (audioBlob, currentLogs) => {
        const currentItem = contents[itemNoRef.current];
        
        const formData = new FormData();
        // 병천 님이 말씀하신 폴더 생성을 위한 필수 데이터 전송
        formData.append('task_id', String(taskId));
        formData.append('user_id', String(userId));
        formData.append('ai_no', String(currentItem.ai_no)); // 문항 번호
        formData.append('audio_file', audioBlob, "talk.webm");
        formData.append('correct_eng', currentItem.correct_eng || "");
        formData.append('correct_except', currentItem.correct_except || "");

        try {
            const res = await axios.post('/api/smalltalk/analyze', formData);
            // 분석 결과를 로그에 기록하고 다음으로 진행
            recordLogAndProceed(res.data.transcribed, res.data.is_correct, currentLogs);
        } catch (err) {
            console.error("Analysis Error:", err);
            recordLogAndProceed("(Error)", false, currentLogs);
        }
    };

    const recordLogAndProceed = (transcript, isCorrect, currentLogs) => {
        const currentIdx = itemNoRef.current;
        const currentItem = contents[currentIdx];
        
        const newLog = {
            task_id: taskId,
            user_id: userId,
            branch_code: branchCode,
            ai_no: currentItem.ai_no,
            question_text: currentItem.correct_eng || "Question", 
            student_transcript: transcript,
            result_status: isCorrect ? 'CORRECT' : 'WRONG'
        };

        const updatedLogs = [...currentLogs, newLog];
        setLogs(updatedLogs); 

        const nextIdx = currentIdx + 1;
        itemNoRef.current = nextIdx;
        setItemNo(nextIdx);
        setTimeout(() => playAISequence(nextIdx, updatedLogs), 500);
    };

    // SmallTalk.jsx 내의 학습 종료 로직
 const finishStudy = async (finalLogs) => {
    if (status === 'FINAL_SAVING') return;
    setStatus('FINAL_SAVING'); // "정리 중이에요..." 메시지 표시

    try {
        // 1️⃣ [GPT 총평 호출] 
        // 지금까지 쌓인 logs(일문일답 전체)를 백엔드로 보냅니다.
        const summaryResponse = await axios.post('/api/smalltalk/generate-smalltalk-summary', {
            results: finalLogs.map(log => ({
                study_eng: log.question_text,      // AI의 질문
                transcribed: log.student_transcript // 학생의 답변
            }))
        });

        const gptSummary = summaryResponse.data.summary;

        // 2️⃣ [최종 결과 저장 호출]
        // GPT가 준 총평(gptSummary)을 포함해서 DB에 최종 저장합니다.
        const completeRes = await axios.post('/api/smalltalk/complete', {
            task_id: taskId,
            user_id: userId,
            branch_code: branchCode,
            re_study: reStudy,
            re_study_no: parseInt(reStudyNo) + 1,
            logs: finalLogs,
            ai_summary: gptSummary // 🚩 DB에 총평 저장
        });

        if (completeRes.data) {
            setAiSummary(gptSummary); // 리포트 컴포넌트에 전달할 상태 업데이트
            setMode('RESULT');        // 리포트 화면으로 전환
        }
    } catch (err) {
        console.error("최종 처리 실패:", err);
        setMode('RESULT'); // 에러가 나더라도 화면은 보여줌
    }
 };

    if (loading) return <div className="loading_box">학습 로드 중...</div>;
    if (!taskInfo) return null;

    return (
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}>
            <div className="eduhead">
                <div className="hd_info">
                    <p>학습자 : <b>{taskInfo.user_name} ({userId})</b></p>
                    <p>교재명 : <span>{taskInfo.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit {taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className="on"><a href="#">SMALL TALK</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ 
                background: mode === 'START' ? "rgba(255,255,255,0.6)" : "#fff",
                borderRadius: mode !== 'START' ? '15px' : '0' 
            }}>
                {mode === 'START' ? (
                    <SmallTalk_intro onStart={handleStartStudy} />
                ) : mode === 'STUDY' ? (
                    <div className="study_content">
                        <div className="conbox1">
                          <div className="speech">
                            <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="AI" /></p>
                            <p className="bubble_tx">
                              <span className="tx_box">
                               {/* 🚩 [추가] 마이크 권한이 차단된 경우 최우선으로 안내 */}
                               {micPermission === 'denied' ? (
                             <span style={{ color: '#ff4d4f', fontWeight: 'bold', display: 'block', lineHeight: '1.4' }}>
                              ⚠️ 마이크 권한이 차단되어 있어요! <br/>
                              주소창 왼쪽 [자물쇠] 아이콘을 눌러 <br/>
                              마이크를 '허용'으로 변경해 주세요.
                            </span>
                             ) : (
                            /* 기존 상태 메시지들 */
                            status === 'PLAYING' ? "루아이의 질문을 잘 들어보세요. 🔊" :
                            status === 'PROCESSING' ? "대답을 분석하고 있어요. ⏳" :
                            status === 'FINAL_SAVING' ? "정리 중이에요... ✨" :
                            status === 'TIMEOUT' ? "응답이 없으셔서 다음 질문으로 넘어갈게요! 😊" :
                            isRecording ? "루아이가 듣고 있어요! 말씀해 보세요. 🎤" :
                            "준비가 되면 마이크를 눌러주세요!"
                            )}
                           </span>
                           </p>
                      </div>
                     <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
                    </div>

                        <div className="conbox2">
                            <div className="boxline boxlong_w">
                                <div className="imgw100">
                                    <img src={displayImg} alt="AI" style={{borderRadius:'15px', maxWidth:'400px'}} 
                                         onError={(e) => e.target.src="/static/study/images/img_logo.png"} />
                                </div>
                            </div>
                        </div>

                        <div className="btns m_txcenter" style={{ marginTop: '20px' }}>
                            <div className="btn_s_cen">
                                {(status === 'PLAYING' || status === 'PROCESSING' || status === 'FINAL_SAVING' || status === 'TIMEOUT') ? (
                                    <button type="button" className="ch_btn">
                                        <img src="/static/study/images/btn_s03.png" className="ani_btn" alt="진행중" />
                                    </button>
                                ) : (
                                    <button type="button" className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} onClick={() => handleRecording(logs)}>
                                        <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="녹음" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <SmallTalkReport 
                        summary={aiSummary} 
                        logs={logs} 
                        userName={taskInfo.user_name} 
                        onClose={() => window.close()} 
                        onRetry={handleRetry} // 👈 다시 하기 함수 전달!
                    />
                )}
            </div>
            
            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; }
                .study_content { width: 100%; height: 100%; padding: 20px 0; }
                #eduwrap { -webkit-overflow-scrolling: touch; }
            `}</style>
        </div>
    );
};

export default SmallTalk;