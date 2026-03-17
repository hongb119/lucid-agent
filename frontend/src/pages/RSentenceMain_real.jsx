import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import RSentenceStep1 from './RSentenceStep1';
import RSentenceQuiz from './RSentenceQuiz';
import RSentenceResult from './RSentenceResult';

const RSentenceMain = () => {
    // 1. URL 파라미터 추출
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';

    // 2. 상태 관리
    const [mode, setMode] = useState('START'); 
    const [taskInfo, setTaskInfo] = useState(null);
    const [sentenceList, setSentenceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);

    const [trackingLogs, setTrackingLogs] = useState([]);
    const [studyStartTime, setStudyStartTime] = useState(null);

    const audioRef = useRef(new Audio());

    const unlockMobileAudio = () => {
        const audio = audioRef.current;
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZRTU9O"; 
        audio.play().then(() => {
            audio.pause();
            console.log("🔊 iOS Audio Unlocked");
        }).catch(() => {});
    };

    // [수정] 리얼 배포 환경 대응: 하드코딩된 HTTP 주소 및 포트 제거
    useEffect(() => {
        const init = async () => {
            try {
                // 1. CSS 로드 수정: http:// 주소 걷어내고 상대 경로 처리
                const cssFiles = ["default.css", "content.css"];
                cssFiles.forEach(file => {
                    const linkId = `css-${file.replace('.', '-')}`;
                    if (!document.getElementById(linkId)) {
                        const link = document.createElement("link");
                        link.id = linkId;
                        link.rel = "stylesheet";
                        // 상대 경로를 사용하여 HTTPS 보안 이슈 해결
                        link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                        document.head.appendChild(link);
                    }
                });

                // 2. API 호출 수정: http://${host}:${port} 걷어내고 상대 경로로 호출
                // 아파치 ProxyPass 설정 (/api)을 타고 백엔드로 전달됩니다.
                const res = await axios.get(`/api/rsentence/fetch`, {
                    params: { task_id: taskId }
                });

                if (res.data.status === "success") {
                    setTaskInfo(res.data.task_info);
                    setSentenceList(res.data.sentences);
                }
            } catch (err) {
                console.error("데이터 로드 실패:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [taskId]);

    const handleCaptureLog = (logEntry) => {
        setTrackingLogs(prev => [...prev, logEntry]);
    };

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

    // [수정] 최종 저장 로직: 상대 경로 반영
    const handleSaveAndFinish = async () => {
        setLoading(true);
        try {
            const totalDuration = studyStartTime ? Math.floor((Date.now() - studyStartTime) / 1000) : 0;
            
            const payload = {
                task_id: Number(taskId),
                user_id: String(userId),
                re_study: String(reStudy),
                re_study_no: Number(taskInfo?.re_study_no || 0),
                tracking_logs: trackingLogs,
                total_time: totalDuration
            };

            // [수정] 저장 API 역시 상대 경로 /api 로 변경
            const res = await axios.post(`/api/rsentence/save`, payload);
            
            if (res.data.result_code === "200") {
                setReportData(res.data);
                setMode('FINISH');
            }
        } catch (err) {
            console.error("저장 중 오류 발생:", err);
            alert("학습 결과 저장 중 오류가 발생했습니다.");
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
                    <li className="on"><a>SENTENCE PRACTICE</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ minHeight: 'calc(100vh - 100px)', background: mode === 'START' ? "rgba(255,255,255,0.6)" : "none" }}>
                
                {mode === 'START' && (
                    <RSentenceStep1 onStart={() => {
                        unlockMobileAudio(); 
                        setMode('QUIZ');
                        setStudyStartTime(Date.now());
                    }} />
                )}
                
                {mode === 'QUIZ' && (
                    <RSentenceQuiz 
                        items={sentenceList} 
                        onLog={handleCaptureLog}
                        onComplete={handleSaveAndFinish} 
                    />
                )}

                {mode === 'FINISH' && (
                    <RSentenceResult 
                        reportData={reportData} 
                        onRetry={() => window.location.reload()} 
                        onExit={handleExit} 
                    />
                )}
            </div>

            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; color: #007bff; }
                input, textarea, select { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; overflow-y: auto; }
            `}</style>
        </div>
    );
};

export default RSentenceMain;