import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatternDrill_Drills = ({ contents, onComplete }) => {
    if (!contents || contents.length === 0) return null;

    const [itemNo, setItemNo] = useState(0);
    const [playStatus, setPlayStatus] = useState("READY"); // READY(클릭대기) -> START(재생) -> SPEAKING(녹음)
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentLogs, setCurrentLogs] = useState([]);

    const audioRef = useRef(new Audio());
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const audioChunks = useRef([]);
    const currentItem = contents[itemNo];

    // [버그 해결 1] 첫 진입 시 브라우저 차단을 막기 위한 초기화
    useEffect(() => {
        // 사용자가 화면을 보게 되면 '재생 준비' 상태로 시작
        setPlayStatus("READY"); 
    }, []);

    // [버그 해결 2] 음성 재생 함수 (에러 핸들링 및 재시도 로직 추가)
    const playAudio = async () => {
        if (!currentItem) return;
        
        try {
            audioRef.current.pause();
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${currentItem.study_mp3_file}`;
            audioRef.current.playbackRate = 0.9;

            setPlayStatus("START"); // 재생 중 상태로 변경

            audioRef.current.onended = () => {
                setPlayStatus("SPEAKING");
                handleStartRecording(); // 음성 끝나면 자동 녹음 시작
            };

            // play()는 Promise를 반환하므로 await로 처리하여 차단 여부 확인
            await audioRef.current.play();
        } catch (err) {
            console.warn("Autoplay 차단됨. 사용자 클릭 대기:", err);
            setPlayStatus("READY"); // 재생 실패 시 다시 버튼 노출
        }
    };

    // [로직] 문장이 바뀔 때마다 실행 (첫 문장은 READY 상태에서 대기)
    useEffect(() => {
        if (itemNo > 0) {
            playAudio(); // 두 번째 문장부터는 이미 사용자 클릭이 있었으므로 자동 재생 가능
        }
    }, [itemNo]);

    // 마이크 시작 로직 (기존과 동일)
    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunks.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorderRef.current.onstop = () => {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                handleAnalyze();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            alert("마이크 권한을 확인해주세요.");
            setPlayStatus("READY");
        }
    };

    const handleAnalyze = async () => {
        setPlayStatus("PROCESSING");
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio_file', audioBlob);
        formData.append('target_text', currentItem.study_eng);

        try {
            const res = await axios.post('/api/patterndrill/analyze-speaking', formData);
            const newLog = {
                study_item_no: currentItem.study_item_no,
                student_transcript: res.data.transcribed,
                is_speaking_correct: res.data.is_correct,
                unscramble_input: "",
                is_unscramble_correct: false
            };
            const updatedLogs = [...currentLogs, newLog];
            setCurrentLogs(updatedLogs);

            if (itemNo + 1 < contents.length) {
                setItemNo(prev => prev + 1);
                setPlayStatus("START"); // 다음 문장은 자동 재생 시도
            } else {
                onComplete(updatedLogs);
            }
        } catch (err) {
            setPlayStatus("READY");
        } finally {
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
                            {playStatus === "SPEAKING" && "문장을 따라 읽어주세요."}
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
                {/* [해결] READY 상태일 때 재생 버튼을 명시적으로 노출하여 브라우저 차단 해제 */}
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
                    >
                        <img src={isRecording ? "/static/study/images/btn_s09.png" : "/static/study/images/btn_s01.png"} alt="mic" />
                    </button>
                )}
                {isProcessing && <div className="spinner"></div>}
            </div>
        </div>
    );
};

export default PatternDrill_Drills;