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

    // [추가] 마이크 예외 처리 함수
    const handleError = (errorName) => {
        setIsRecording(false);
        let userMessage = "마이크 초기화에 실패했습니다. 다시 시도해 주세요.";

        switch (errorName) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                userMessage = "마이크 권한이 거부되었습니다.\n주소창의 자물쇠 아이콘을 눌러 마이크를 '허용'으로 변경해 주세요.";
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                userMessage = "연결된 마이크를 찾을 수 없습니다.\n마이크 연결 상태를 확인해 주세요.";
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                userMessage = "마이크가 다른 프로그램(줌, 카톡 등)에서 사용 중입니다.\n다른 앱을 종료하고 다시 시도해 주세요.";
                break;
            default:
                console.error("Recording Error:", errorName);
        }
        alert(userMessage);
        setPlayStatus("READY"); // 오류 발생 시 READY 상태로 복구하여 다시 시작할 수 있게 함
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

    const handleStartRecording = async () => {
        try {
            // 마이크 권한 요청 및 스트림 획득
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                if (recordingTimerRef.current) {
                    clearTimeout(recordingTimerRef.current);
                    recordingTimerRef.current = null;
                }
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                handleAnalyze();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

            // 20초 자동 타임아웃
            recordingTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    console.warn("🚩 20초 시간 초과로 자동 녹음 종료");
                    mediaRecorderRef.current.stop();
                }
            }, 20000);

        } catch (err) {
            // [수정] 단순 alert 대신 정교한 예외 처리 호출
            handleError(err.name);
        }
    };

    const handleAnalyze = async () => {
    // 1. 상태를 분석 중으로 변경
    setPlayStatus("PROCESSING");

    // 2. 녹음된 오디오 청크들을 하나의 Blob으로 합침
    // 타입은 백엔드 Whisper가 인식하기 좋은 audio/wav 또는 audio/webm 사용
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });

    // 3. FormData 객체 생성 (파일과 일반 필드를 함께 보내기 위함)
    const formData = new FormData();
    
    /**
     * [핵심] 백엔드 FastAPI의 파라미터명과 정확히 일치시켜야 422 에러가 나지 않습니다.
     * 필드명: audio_file, task_id, study_item_no, user_id, branch_code
     */
    formData.append('audio_file', audioBlob, 'student_recording.wav'); // 파일 (파일명 지정 권장)
    formData.append('task_id', task_id);                             // 부모로부터 받은 taskId
    formData.append('study_item_no', currentItem.study_item_no);      // 현재 문장 번호
    formData.append('user_id', user_id);                             // 프로젝트 규칙: 유저ID 필수
    formData.append('branch_code', branch_code);                     // 프로젝트 규칙: 지점코드 필수

    try {
        // 4. API 호출 (헤더는 axios가 FormData를 감지하여 multipart/form-data로 자동 설정함)
        const res = await axios.post('/api/patterndrill/analyze-speaking', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.result_code === "200") {
            // 5. 분석 결과 로그 생성
            const newLog = {
                study_item_no: currentItem.study_item_no,
                question_text: currentItem.study_eng,
                student_transcript: res.data.transcript, // 백엔드에서 준 transcript 텍스트
                is_speaking_correct: true,               // 필요 시 res.data.is_correct 판정값 사용
                unscramble_input: "",
                is_unscramble_correct: false
            };

            const updatedLogs = [...currentLogs, newLog];
            setCurrentLogs(updatedLogs);

            // 6. 다음 문장으로 이동하거나 학습 종료 처리
            if (itemNo + 1 < contents.length) {
                setItemNo(prev => prev + 1);
            } else {
                // 부모 컴포넌트의 handleDrillComplete 호출
                onComplete(updatedLogs);
            }
        } else {
            console.error("서버 응답 오류:", res.data);
            alert("분석 실패: " + (res.data.error || "알 수 없는 오류"));
            setPlayStatus("READY");
        }

    } catch (err) {
        // 422 에러 발생 시 상세 원인을 콘솔에 출력 (디버깅용)
        console.error("❌ API 호출 에러 상세:", err.response?.data);
        alert("분석 중 통신 오류가 발생했습니다.");
        setPlayStatus("READY");
    } finally {
        // 7. 녹음 상태 해제
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