import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DictaIntro from './DictaIntro';
import DictaScramble from './DictaScramble';
import DictaFinish from './DictaFinish';
import DictaQuiz from './DictaQuiz';
import DictaTotalFinish from './DictaTotalFinish';

const DictaMain = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';

    const [mode, setMode] = useState('START'); 
    const [scrambleWords, setScrambleWords] = useState([]); 
    const [quizWords, setQuizWords] = useState([]);         
    const [taskInfo, setTaskInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);

    const [trackingLogs, setTrackingLogs] = useState([]); 
    const [studyStartTime, setStudyStartTime] = useState(null);

    // [로직 추가] iOS Safari 오디오 잠금 해제 함수
    const unlockAudio = () => {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZRTU9O");
        silentAudio.play().then(() => {
            silentAudio.pause();
            console.log("🔊 Mobile Audio Unlocked");
        }).catch(() => {});
    };

    useEffect(() => {
        const init = async () => {
            try {
                // [수정] CSS 로드 시 http:// 주소를 제거하고 상대 경로 /static 사용
                const cssFiles = ["default.css", "content.css"];
                cssFiles.forEach(file => {
                    const linkId = `css-${file.replace('.', '-')}`;
                    if (!document.getElementById(linkId)) {
                        const link = document.createElement("link");
                        link.id = linkId;
                        link.rel = "stylesheet";
                        // 절대 경로를 사용하여 HTTPS 보안 이슈 해결
                        link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                        document.head.appendChild(link);
                    }
                });

                // [수정] API 호출 시 http://...:8080 주소를 제거하고 상대 경로 /api 사용
                const res = await axios.get(`/api/dicta/fetch-dicta`, {
                    params: { task_id: taskId, user_id: userId, re_study: reStudy }
                });

                if (res.data.status === "success") {
                    setScrambleWords(res.data.words || []);
                    setQuizWords(res.data.quizzes || []);
                    setTaskInfo(res.data.task_info);
                }
            } catch (err) {
                console.error("데이터 로드 실패:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [taskId, userId, reStudy]);

    const handleExit = () => {
        try {
            if (window.opener && !window.opener.closed) {
                if (typeof window.opener.fnReload === 'function') {
                    window.opener.fnReload();
                } else {
                    window.opener.location.reload();
                }
            }
        } catch (e) {
            console.warn("부모 창 접근 제한:", e);
        }
        window.close();
    };

    const handleCaptureLog = (logEntry) => {
        setTrackingLogs(prev => [...prev, logEntry]);
    };

    const handleSaveAndFinish = async (finalInputArray) => {
        console.log("🚀 [저장 프로세스 시작]");
        setLoading(true);

        try {
            const totalDuration = studyStartTime ? Math.floor((Date.now() - studyStartTime) / 1000) : 0;

            const cleanedInputArray = (finalInputArray || []).map((item, idx) => ({
                study_no: Number(item.study_no || taskInfo?.study_no || 0),
                study_item_no: Number(item.study_item_no || (idx + 1)),
                input_eng: String(item.input_eng || "-"),
                input_eng_pass: String(item.input_eng_pass || "N")
            }));

            const cleanedLogs = (trackingLogs || []).map(log => ({
                study_item_no: Number(log.study_item_no),
                try_count: Number(log.try_count || 1),
                taken_time: Number(log.taken_time || 0),
                is_hint_used: String(log.is_hint_used || "N")
            }));

            const payload = {
                task_id: Number(taskId),
                user_id: String(userId),
                re_study: String(reStudy),
                re_study_no: Number(taskInfo?.re_study_no || 0),
                inputArray: cleanedInputArray,
                tracking_logs: cleanedLogs,
                total_time: totalDuration
            };

            // [수정] 저장 API 역시 상대 경로 /api 로 변경
            const res = await axios.post(`/api/dicta/save-tracking`, payload);

            if (res.data.result_code === "200") {
                setReportData(res.data); 
                setMode('TOTAL_FINISH');
            } else {
                alert("저장 실패: " + res.data.message);
            }
        } catch (err) {
            console.error("❌ [저장 에러]:", err);
            alert("서버 연결에 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    if (loading || !taskInfo) return <div className="loading_box">Loading...</div>;

    return (
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}>
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.study_step2_name} {taskInfo.study_step3_name}</span></p>
                    <p>학습명 : <span>{taskInfo.study_part !== "-" ? taskInfo.study_part : ""} Unit{taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={['START', 'SCRAMBLE', 'FINISH'].includes(mode) ? 'on' : ''}><a>DICTATION</a></li>
                    <li className={['QUIZ', 'TOTAL_FINISH'].includes(mode) ? 'on' : ''}><a>QUIZ</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ minHeight: 'calc(100vh - 100px)', background: mode === 'START' ? "rgba(255,255,255,0.6)" : "none" }}>
                {mode === 'START' && (
                    <DictaIntro 
                        words={scrambleWords} 
                        onStart={() => {
                            unlockAudio(); 
                            setMode('SCRAMBLE');
                            setStudyStartTime(Date.now());
                        }} 
                    />
                )}
                
                {mode === 'SCRAMBLE' && (
                    <DictaScramble 
                        words={scrambleWords} 
                        onLog={handleCaptureLog}
                        onComplete={() => setMode('FINISH')} 
                    />
                )}

                {mode === 'FINISH' && (
                    <DictaFinish 
                        onRetry={() => {
                            setTrackingLogs([]);
                            setMode('SCRAMBLE');
                        }}
                        onNext={() => setMode('QUIZ')}
                    />
                )}
                
                {mode === 'QUIZ' && (
                    <DictaQuiz 
                        words={quizWords} 
                        onLog={handleCaptureLog}
                        onComplete={handleSaveAndFinish} 
                    />
                )}

                {mode === 'TOTAL_FINISH' && (
                    <DictaTotalFinish 
                        reportData={reportData} 
                        onRetry={() => window.location.reload()} 
                        onExit={handleExit} 
                    />
                )}
            </div>

            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; }
                input, button { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; }
            `}</style>
        </div>
    );
};

export default DictaMain;