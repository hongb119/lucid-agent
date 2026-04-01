import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import RSentenceStep1 from './RSentenceStep1';
import RSentenceQuiz from './RSentenceQuiz';
import RSentenceResult from './RSentenceResult';
import { AgentContext } from '../App'; 

const RSentenceMain = () => {
    const { triggerAgent } = useContext(AgentContext);

    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';
    const branchCode = queryParams.get('branch_code') || 'MAIN';

    // [상태 관리]
    const [mode, setMode] = useState('START'); 
    const [taskInfo, setTaskInfo] = useState(null);
    const [allSentences, setAllSentences] = useState([]); // 🚩 원본 보존용 (절대 수정 금지)
    const [sentenceList, setSentenceList] = useState([]); // 🚩 실제 학습 진행용
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
        }).catch(() => {});
    };

    useEffect(() => {
        const init = async () => {
            try {
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

                const res = await axios.get(`/api/rsentence/fetch`, {
                    params: { task_id: taskId }
                });

                if (res.data.status === "success") {
                    setTaskInfo(res.data.task_info);
                    // 🚩 초기 로드 시 두 곳 모두에 저장
                    setAllSentences(res.data.sentences);
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

    const handleStartStudy = () => {
        unlockMobileAudio();
        setMode('QUIZ');
        setStudyStartTime(Date.now());

        if (triggerAgent) {
            triggerAgent({
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, task_type: 'rsentence'
            });
        }
    };

    // [🚩 수정된 리트라이 핸들러]
    const handleRetry = (incorrectIds) => {
        setTrackingLogs([]); // 기존 로그 초기화
        setReportData(null); // 결과 초기화

        if (incorrectIds && incorrectIds.length > 0) {
            // 1. 오답만 골라내기 (원본 allSentences에서 필터링)
            const retryList = allSentences.filter(s => 
                incorrectIds.includes(Number(s.study_item_no))
            );
            setSentenceList(retryList);
            setMode('QUIZ'); // 인트로 없이 즉시 퀴즈로 (원하실 경우 'START'로 변경 가능)
        } else {
            // 2. 전체 다시 하기
            setSentenceList(allSentences);
            setMode('START'); 
        }
        
        setStudyStartTime(Date.now()); // 시간 재측정 시작
    };

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
        } catch (e) { console.warn("부모 창 접근 제한:", e); }
        window.close();
    };

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
                total_time: totalDuration,
                branch_code: branchCode 
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
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.study_step2_name} {taskInfo.study_step3_name}</span></p>
                    <p>학습명 : <span>{taskInfo.study_part !== "-" ? taskInfo.study_part : ""} Unit{taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className="on"><a>DICTATION</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ 
                minHeight: 'calc(100vh - 100px)', 
                background: mode === 'START' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.6)",
                transition: 'background 0.5s ease' 
            }}>
                
                {mode === 'START' && (
                    <RSentenceStep1 
                        userId={userId} 
                        onStart={handleStartStudy} 
                    />
                )}
                
                {mode === 'QUIZ' && (
                    <RSentenceQuiz 
                        items={sentenceList} // 🚩 필터링된 리스트가 자동으로 적용됨
                        onLog={handleCaptureLog}
                        onComplete={handleSaveAndFinish} 
                    />
                )}

                {mode === 'FINISH' && (
                    <RSentenceResult 
                        reportData={reportData} 
                        onRetry={handleRetry} // 🚩 오답 ID 배열을 받아 처리함
                        onExit={handleExit} 
                    />
                )}
            </div>

            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; color: #007bff; font-size: 20px; }
                input, textarea, select { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; overflow-y: auto; }
            `}</style>
        </div>
    );
};

export default RSentenceMain;