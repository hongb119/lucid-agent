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

    // [추가] 에러 메시지 처리 함수
    const handleError = (errorName) => {
        setIsRecording(false);
        let userMessage = "마이크 초기화에 실패했습니다. 다시 시도해 주세요.";

        switch (errorName) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                userMessage = "마이크 권한이 거부되었습니다. 주소창의 자물쇠 아이콘을 눌러 마이크를 '허용'으로 변경해 주세요.";
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                userMessage = "연결된 마이크를 찾을 수 없습니다. 마이크 연결 상태를 확인해 주세요.";
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                userMessage = "마이크가 다른 프로그램(줌, 카톡 등)에서 사용 중입니다. 다른 앱을 종료하고 다시 시도해 주세요.";
                break;
            default:
                console.error("Recording Error:", errorName);
        }
        alert(userMessage);
        setStatus('READY'); // 상태를 다시 준비 상태로
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
        if (!contents[targetIdx] || mode === 'RESULT') return;

        stopAllAudio();
        setStatus('PLAYING');
        const item = contents[targetIdx];
        setDisplayImg(`https://admin.lucideducation.co.kr/uploadDir/study/ai/${item.eng_img}`);
        
        const isLastItem = targetIdx === contents.length - 1;
        currentAudioIdxRef.current = 1;

        const playNext = () => {
            if (itemNoRef.current !== targetIdx) return; 

            const idx = currentAudioIdxRef.current;
            const fileField = `eng_mp3_${idx}`;
            
            if (item[fileField] && item[fileField] !== 'N') {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/tts/${item[fileField]}`;
                audioRef.current.onended = () => {
                    currentAudioIdxRef.current++;
                    playNext();
                };
                audioRef.current.play().catch(() => {
                    if (isLastItem) finishStudy(currentLogs);
                    else startAutomaticRecording(currentLogs);
                });
            } else {
                if (isLastItem) {
                    finishStudy(currentLogs);
                } else {
                    startAutomaticRecording(currentLogs); 
                }
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

    // [수정] 에러 핸들링이 강화된 녹음 함수
    const handleRecording = async (currentLogs, forceStart = false) => {
        // 이미 녹음 중일 때 한 번 더 누르면 중단 로직
        if (isRecording && !forceStart) {
            if (mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        try {
            // 1. 마이크 스트림 요청 (에코 취소 및 노이즈 억제 옵션 추가)
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                // 데이터가 너무 작으면(녹음 실패) 처리
                if (blob.size < 2000) { // 파일이 너무 작으면 (거의 무음 수준)
                    alert("음성이 감지되지 않았습니다. 조금 더 크게 말씀해 주세요!");
                    console.warn("Recorded audio is too short.");
                    setStatus('READY');
                    return;
                }

                setStatus('PROCESSING');
                const currentItem = contents[itemNoRef.current];
                const formData = new FormData();
                formData.append('audio_file', blob);
                formData.append('correct_eng', currentItem.correct_eng || "");
                
                try {
                    const res = await axios.post('/api/smalltalk/analyze', formData);
                    recordLogAndProceed(res.data.transcribed, res.data.is_correct, currentLogs);
                } catch (err) { 
                    console.error("Analysis Error:", err);
                    recordLogAndProceed("(Error)", false, currentLogs); 
                } finally {
                    // 녹음이 완전히 끝나면 트랙 종료 (마이크 점유 해제)
                    stream.getTracks().forEach(t => t.stop());
                }
            };

            // 녹음 시작
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setStatus('SPEAKING'); // 말하기 상태로 명시적 변경

        } catch (err) {
            // catch 블록에서 상세 에러 처리
            handleError(err.name);
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

    const finishStudy = async (finalLogs) => {
        if (status === 'FINAL_SAVING') return;
        setStatus('FINAL_SAVING');
        try {
            const res = await axios.post('/api/smalltalk/complete', {
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, re_study_no: parseInt(reStudyNo) + 1,
                logs: (finalLogs && finalLogs.length > 0) ? finalLogs : logs
            });
            if (res.data) {
                setAiSummary(res.data.summary);
                if (window.opener?.fnReload) window.opener.fnReload();
                setMode('RESULT');
            }
        } catch (err) { setMode('RESULT'); }
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
                    <SmallTalkReport summary={aiSummary} logs={logs} userName={taskInfo.user_name} onClose={() => window.close()} />
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