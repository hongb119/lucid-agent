import React, { useState, useEffect, useRef } from 'react';

const MicTestModal = ({ onConfirm, onClose }) => {
    const [isTesting, setIsTesting] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [testPassed, setTestPassed] = useState(false);
    const [stream, setStream] = useState(null);
    
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const requestRef = useRef(null);

    // [1] 마이크 권한 요청 및 스트림 연결
    const startMicTest = async () => {
        try {
            const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(userStream);
            setIsTesting(true);

            // 오디오 분석기 설정 (시각화용)
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(userStream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;

            updateAudioLevel();
        } catch (err) {
            alert("마이크 권한이 거부되었거나 연결된 기기가 없습니다. 설정에서 마이크를 허용해주세요.");
            onClose();
        }
    };

    // [2] 실시간 음량 체크 (애니메이션)
    const updateAudioLevel = () => {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // 평균 음량 계산
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;
        setAudioLevel(average);

        // 일정 수치 이상이면 '테스트 통과'로 간주
        if (average > 30) setTestPassed(true);

        requestRef.current = requestAnimationFrame(updateAudioLevel);
    };

    // [3] 정리(Clean-up)
    const stopMicTest = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        setIsTesting(false);
    };

    useEffect(() => {
        return () => stopMicTest();
    }, []);

    return (
        <div className="mic_test_overlay">
            <div className="mic_test_content">
                <h3>🎤 마이크 연결 테스트</h3>
                <p>학습 전, 목소리가 잘 전달되는지 확인합니다.</p>

                {!isTesting ? (
                    <button className="test_btn start" onClick={startMicTest}>테스트 시작</button>
                ) : (
                    <div className="test_indicator">
                        <div className="visualizer_bg">
                            {/* 음량에 따라 너비가 변하는 바 */}
                            <div className="visualizer_bar" style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}></div>
                        </div>
                        <p className="status_txt">
                            {testPassed ? "✅ 목소리가 감지되었습니다!" : "아~ 하고 소리를 내보세요."}
                        </p>
                    </div>
                )}

                <div className="test_footer">
                    <button className="test_btn close" onClick={onClose}>취소</button>
                    <button 
                        className={`test_btn confirm ${testPassed ? 'active' : ''}`} 
                        disabled={!testPassed}
                        onClick={() => { stopMicTest(); onConfirm(); }}
                    >
                        확인 완료 및 시작
                    </button>
                </div>
            </div>

            <style>{`
                .mic_test_overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:20000; }
                .mic_test_content { background:#fff; padding:30px; border-radius:15px; width:90%; max-width:400px; text-align:center; }
                .test_indicator { margin:25px 0; }
                .visualizer_bg { width:100%; height:20px; background:#eee; border-radius:10px; overflow:hidden; margin-bottom:10px; }
                .visualizer_bar { height:100%; background:#6F6BE6; transition: width 0.1s ease; }
                .status_txt { font-weight:bold; color:#6F6BE6; height:24px; }
                .test_footer { display:flex; gap:10px; margin-top:20px; }
                .test_btn { flex:1; height:45px; border-radius:8px; border:none; cursor:pointer; font-weight:bold; }
                .test_btn.start { background:#6F6BE6; color:#fff; }
                .test_btn.confirm { background:#ccc; color:#fff; }
                .test_btn.confirm.active { background:#2ecc71; }
                .test_btn.close { background:#f5f5f5; color:#666; }
            `}</style>
        </div>
    );
};

export default MicTestModal;