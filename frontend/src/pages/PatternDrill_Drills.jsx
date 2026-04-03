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
    const audioBlobsRef = useRef([]); // 🚩 문항별 녹음 파일을 담을 배열
    const currentItem = contents[itemNo];

    useEffect(() => {
        setPlayStatus("READY"); 
        // 언마운트 시 타이머 정리
        return () => {
            if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        };
    }, []);

    // 비교를 위한 텍스트 정규화 함수
    const normalizeText = (text) => text.toLowerCase().replace(/[^a-zA-Z0-9]/g, "").trim();

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

              // 1. 현재까지의 조각(Chunks)으로 Blob 생성
             const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
    
            // 🚩 중요: 다음 녹음을 위해 데이터 조각 배열을 즉시 초기화
            audioChunks.current = []; 

            // 2. 최후의 방어선 (용량 체크)
           if (blob.size < 2000) { 
              handleRetry("음성 입력이 너무 짧습니다. 다시 시도해 주세요.");
              return; 
             }

    setPlayStatus("PROCESSING");
    const avgDb = await getAverageDecibels(blob);
    console.log(`🎤 문항 ${itemNo + 1} 음량: ${avgDb.toFixed(2)} dB`);

    if (avgDb < -45) {
        handleRetry("소리가 너무 작습니다. 다시 시도해 주세요.");
        return;
    }

              // 🚩 중요: 다음 문항에서 마이크를 새로 잡을 수 있도록 현재 스트림을 완전히 종료
                stopStream(); 

              // 3. 바구니에 담으러 가기
                handleAnalyze(blob); 
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

 // PatternDrill_Drills.jsx 내부의 handleAnalyze 함수 교체
const handleAnalyze = async (audioBlob) => {
    setIsProcessing(true);
    setPlayStatus("PROCESSING");

    const formData = new FormData();
    formData.append("task_id", String(task_id));
    formData.append("user_code", String(user_id));
    formData.append("branch_code", String(branch_code || "MAIN")); 
    formData.append("question_text", currentItem.study_eng); 
    formData.append("study_item_no", String(currentItem.study_item_no));
    formData.append("audio_file", audioBlob, "unit.webm");

    try {
        // 🚩 서버에 한 문장씩 즉시 분석 요청
        const res = await axios.post('/api/patterndrill/analyze-single', formData);
        
        if (res.data.status === "success") {
            const studentText = res.data.transcribed || "";
            
            // 현재 문항 결과 생성
            const newLog = {
                study_item_no: currentItem.study_item_no,
                question_text: currentItem.study_eng,
                student_transcript: studentText,
                // 정규화 비교를 통해 일치 여부 판정
                is_speaking_correct: normalizeText(currentItem.study_eng) === normalizeText(studentText),
                unscramble_input: "",
                is_unscramble_correct: false
            };

            const updatedLogs = [...currentLogs, newLog];
            setCurrentLogs(updatedLogs);

            // 다음 문항으로 이동하거나 종료
            if (itemNo + 1 < contents.length) {
                setItemNo(prev => prev + 1);
                setPlayStatus("READY");
            } else {
                // 마지막 문항이면 부모(PatternDrill.jsx)에게 최종 로그 전달
                onComplete(updatedLogs);
            }
        }
    } catch (err) {
        console.error("❌ 분석 실패:", err);
        alert("문장 분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
        setPlayStatus("READY");
    } finally {
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