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

    // 트래킹 로그 및 시간 측정용
    const [trackingLogs, setTrackingLogs] = useState([]);
    const [studyStartTime, setStudyStartTime] = useState(null);

    // [iOS 대응] 아이폰 Safari 오디오 잠금 해제용 Ref
    const audioRef = useRef(new Audio());

    const unlockMobileAudio = () => {
        const audio = audioRef.current;
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZRTU9O"; // 묵음 데이터
        audio.play().then(() => {
            audio.pause();
            console.log("🔊 iOS Audio Unlocked");
        }).catch(() => {});
    };

    // [1] 디자인 강제 주입: 기존 PHP CSS를 로드하여 디자인 유실 방지
    useEffect(() => {
        const init = async () => {
            try {
                //const host = `http://${window.location.hostname}`;
                // 배포 환경 포트 대응 (로컬 8080 / 실서버 80)
                //const apiPort = window.location.port === '3000' ? ':8080' : (window.location.port ? `:${window.location.port}` : '');

                const cssFiles = ["default.css", "content.css"];
                cssFiles.forEach(file => {
                    const linkId = `css-${file.replace('.', '-')}`;
                    if (!document.getElementById(linkId)) {
                        const link = document.createElement("link");
                        link.id = linkId;
                        link.rel = "stylesheet";
                        link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                        document.head.appendChild(link);
                    }
                });

                // API 서버로부터 문항 데이터 호출
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

    // 퀴즈 컴포넌트에서 전달되는 개별 문항 로그 수집
    const handleCaptureLog = (logEntry) => {
        setTrackingLogs(prev => [...prev, logEntry]);
    };

    // [2] 닫기 핸들러: 보안 정책 우회 및 부모창 새로고침 포함
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

    // [3] 최종 저장 및 완료 로직 (기존 로직 보존)
    const handleSaveAndFinish = async () => {
        setLoading(true);
        try {
            //const host = `http://${window.location.hostname}`;
            //const apiPort = window.location.port === '3000' ? ':8080' : (window.location.port ? `:${window.location.port}` : '');
            const totalDuration = studyStartTime ? Math.floor((Date.now() - studyStartTime) / 1000) : 0;
            
            const payload = {
                task_id: Number(taskId),
                user_id: String(userId),
                re_study: String(reStudy),
                re_study_no: Number(taskInfo?.re_study_no || 0),
                tracking_logs: trackingLogs,
                total_time: totalDuration
            };

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
            {/* 상단 헤더 */}
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.study_step2_name} {taskInfo.study_step3_name}</span></p>
                    <p>학습명 : <span>{taskInfo.study_part !== "-" ? taskInfo.study_part : ""} Unit{taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className="on"><a>DICTATION</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ minHeight: 'calc(100vh - 100px)', background: mode === 'START' ? "rgba(255,255,255,0.6)" : "none" }}>
                
                {mode === 'START' && (
                    <RSentenceStep1 onStart={() => {
                        unlockMobileAudio(); // [추가] 모바일 오디오 잠금 해제
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

            {/* 모바일 최적화 인라인 스타일 */}
            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; color: #007bff; }
                input, textarea, select { font-size: 16px !important; } /* 아이폰 자동 줌 방지 */
                #eduwrap { -webkit-overflow-scrolling: touch; overflow-y: auto; }
            `}</style>
        </div>
    );
};

export default RSentenceMain;