import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatternDrill_Drills = ({ contents, onComplete, task_id, user_id, branch_code }) => {
    if (!contents || contents.length === 0) return null;

    const [itemNo, setItemNo] = useState(0);
    const [playStatus, setPlayStatus] = useState("READY"); 
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentLogs, setCurrentLogs] = useState([]);

    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);
    const recordingTimerRef = useRef(null); // [디버깅] 20초 타이머용 Ref 추가
    const currentItem = contents[itemNo];

    useEffect(() => {
        setPlayStatus("READY"); 
        // 언마운트 시 타이머 정리
        return () => {
            if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        };
    }, []);

    // --- [추가] 자원 정리 함수 ---
    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    // --- [추가/수정] 재시도 유도 함수 ---
    const handleRetry = (message) => {
        alert(`${message}\n\n마이크와 환경을 확인하신 후 다시 시도해 주세요.`);
        stopStream();
        setIsRecording(false);
        setIsProcessing(false);
        setPlayStatus("READY"); // 버튼을 START AUDIO 상태로 되돌림
        audioChunks.current = [];
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

   // [수정] 마이크 예외 처리 함수 (자동 종료 보강)
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

        handleRetry(userMessage);
    };

    const playAudio = async () => {
        if (!currentItem) return;
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current); // 타이머 초기화

        try {
            audioRef.current.pause();
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${currentItem.study_mp3_file}`;
            audioRef.current.playbackRate = 0.9;
            setPlayStatus("START");

            audioRef.current.onended = () => {
                setPlayStatus("SPEAKING");
                handleStartRecording(); 
            };
            await audioRef.current.play();
        } catch (err) {
            setPlayStatus("READY");
        }
    };

    useEffect(() => {
        if (itemNo > 0) playAudio();
    }, [itemNo]);

    // [수정] 녹음 제어 로직 (데시벨 검증 연동)
    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true } 
            });
            
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            
            mediaRecorderRef.current.onstop = async () => {
                if (recordingTimerRef.current) {
                    clearTimeout(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }

                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });

                // 🚩 [최후의 방어선 1] 파일 용량 체크
                if (blob.size < 2000) { 
                 handleRetry("음성 입력이 감지되지 않았습니다. 마이크 연결을 확인하고 다시 시도해 주세요.");
                 return; 
                }

                // 🚩 [최후의 방어선 2] 데시벨 분석 체크 (노이즈 방어)
                setPlayStatus("PROCESSING");
                const avgDb = await getAverageDecibels(blob);
                console.log(`🎤 패턴드릴 음량 분석: ${avgDb.toFixed(2)} dB`);

                // -45dB 미만 시 하드웨어 이슈로 판단하고 종료
                if (avgDb < -45) {
                    handleRetry("마이크 소리가 너무 작거나 노이즈만 들립니다.\n다시 시도해 주세요.");
                    return;
                }

                // 스트림 종료 및 분석 시작
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                handleAnalyze(blob); // 분석 함수로 전달 (handleAnalyze 내부 로직도 일부 수정 필요)
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

            recordingTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            }, 20000);

        } catch (err) {
            handleError(err.name);
        }
    };

    const handleAnalyze = async (audioBlob) => {
        // 1. 상태를 분석 중으로 변경 (UI 피드백)
        setPlayStatus("PROCESSING");
        setIsProcessing(true);

        /**
         * [핵심] FormData 구성
         * 백엔드 FastAPI 파라미터명: audio_file, task_id, study_item_no, user_id, branch_code
         */
        const formData = new FormData();
        
        // Whisper AI 분석을 위해 파일을 student_recording.wav 이름으로 첨부
        formData.append('audio_file', audioBlob, 'student_recording.wav'); 
        formData.append('task_id', String(task_id)); // 문자열 변환으로 안정성 확보
        formData.append('study_item_no', String(currentItem.study_item_no));
        formData.append('user_id', String(user_id));
        formData.append('branch_code', String(branch_code));

        try {
            // 2. API 호출 (multipart/form-data)
            const res = await axios.post('/api/patterndrill/analyze-speaking', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.result_code === "200") {
                // 3. 분석 결과 로그 객체 생성
                const newLog = {
                    study_item_no: currentItem.study_item_no,
                    question_text: currentItem.study_eng,
                    student_transcript: res.data.transcript || "", // AI가 받아쓴 텍스트
                    is_speaking_correct: true, // 패턴드릴 스피킹은 발화 성공 시 기본 true
                    unscramble_input: "",      // 드릴 단계이므로 빈값
                    is_unscramble_correct: false
                };

                // 4. 기존 로그 배열에 추가
                const updatedLogs = [...currentLogs, newLog];
                setCurrentLogs(updatedLogs);

                // 5. 다음 단계 결정 (마지막 문항 여부 체크)
                if (itemNo + 1 < contents.length) {
                    // 다음 문항으로 이동 -> useEffect가 감지하여 playAudio 실행
                    setItemNo(prev => prev + 1);
                } else {
                    // 모든 드릴 완료 -> 부모 컴포넌트의 완료 핸들러 호출
                    if (onComplete) {
                        onComplete(updatedLogs);
                    }
                }
            } else {
                // 서버 내부 에러 처리 (예: API는 성공했으나 분석 결과가 없음)
                console.error("서버 분석 오류:", res.data);
                alert("분석 실패: " + (res.data.error || "데이터를 처리할 수 없습니다."));
                setPlayStatus("READY");
            }

        } catch (err) {
            // 6. 통신 에러 및 422 유효성 에러 디버깅
            console.error("❌ API 호출 에러 상세:", err.response?.data);
            
            // 422 에러인 경우 백엔드가 요구하는 파라미터가 누락되었을 확률이 높음
            const errorDetail = err.response?.data?.detail;
            const errorMsg = typeof errorDetail === 'string' ? errorDetail : "분석 중 통신 오류가 발생했습니다.";
            
            alert(errorMsg);
            setPlayStatus("READY"); // 다시 시도할 수 있도록 상태 복구
        } finally {
            // 7. 처리 상태 해제
            setIsProcessing(false);
            setIsRecording(false);
        }
    };

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {playStatus === "READY" && "하단의 마이크 버튼을 눌러 큰소리로 말해보세요."}
                            {playStatus === "START" && "루아이가 들려주는 음성을 잘 들어보세요."}
                            {playStatus === "SPEAKING" && (isRecording ? "문장을 따라 읽어주세요. (20초 이내)" : "준비되셨나요?")}
                            {playStatus === "PROCESSING" && "AI 분석 중입니다 잠시만 기다리세요..."}
                        </span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
            </div>

            <div className="conbox2">
                <div className="boxline">
                    <div className="boxtext smsize" id="data-eng">
                        {currentItem.study_eng}
                    </div>
                </div>
            </div>

            <div className="btns m_txcenter">
                {playStatus === "READY" && (
                    <button type="button" className="ch_btn" onClick={playAudio}>
                        <img src="/static/study/images/btn_s01.png" alt="start" />
                        <p style={{fontSize: '12px', marginTop: '5px'}}>START AUDIO</p>
                    </button>
                )}

                {playStatus === "START" && (
                    <button type="button" className="ch_btn">
                        <img src="/static/study/images/btn_s03.png" alt="listening" />
                    </button>
                )}

                {(playStatus === "SPEAKING" || playStatus === "PROCESSING") && (
                    <button 
                        type="button" 
                        className={`ch_btn ${isRecording ? 'ani_btn' : ''}`} 
                        onClick={() => isRecording && mediaRecorderRef.current.stop()}
                        disabled={playStatus === "PROCESSING"}
                    >
                        <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="mic" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default PatternDrill_Drills;