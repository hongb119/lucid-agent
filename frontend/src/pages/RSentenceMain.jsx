import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import RSentenceStep1 from './RSentenceStep1';
import RSentenceQuiz from './RSentenceQuiz';
import RSentenceResult from './RSentenceResult';
import { AgentContext } from '../App'; 

const RSentenceMain = () => {
    // [1] AI 에이전트 제어 컨텍스트 (패턴드릴과 동일)
    const { triggerAgent } = useContext(AgentContext);

    // [2] URL 파라미터 추출 및 초기화
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';
    const branchCode = queryParams.get('branch_code') || 'MAIN'; // 지점코드 추가

    // [3] 상태 관리 (기능 누락 없음)
    const [mode, setMode] = useState('START'); 
    const [taskInfo, setTaskInfo] = useState(null);
    const [sentenceList, setSentenceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [trackingLogs, setTrackingLogs] = useState([]);
    const [studyStartTime, setStudyStartTime] = useState(null);

    // [4] 모바일 오디오 잠금 해제용 Ref (iOS 대응)
    const audioRef = useRef(new Audio());

    const unlockMobileAudio = () => {
        const audio = audioRef.current;
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZRTU9O"; // 묵음 데이터
        audio.play().then(() => {
            audio.pause();
            console.log("🔊 iOS Audio Unlocked");
        }).catch(() => {});
    };

    // [5] 초기 데이터 및 CSS 로드
    useEffect(() => {
        const init = async () => {
            try {
                // 표준 CSS 파일 로드
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

                // 학습 데이터 로드
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

    // [6] 학습 시작 핸들러 (에이전트 인사 + 모드 변경 통합)
    const handleStartStudy = () => {
        // 기존 로직 1: 모바일 오디오 잠금 해제
        unlockMobileAudio();
        
        // 기존 로직 2: 모드 변경 및 시간 측정 시작
        setMode('QUIZ');
        setStudyStartTime(Date.now());

        // 추가 로직: 루아이(AI 에이전트) 인사 호출 (패턴드릴과 동일한 구조)
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId,
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                task_type: 'rsentence' // 리뷰 센텐스 타입 명시
            });
        }
    };

    // [7] 퀴즈 로그 수집
    const handleCaptureLog = (logEntry) => {
        setTrackingLogs(prev => [...prev, logEntry]);
    };

    // [8] 닫기 핸들러 (부모창 새로고침 포함)
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

    // [9] 최종 저장 및 완료 로직
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
            {/* 상단 헤더 정보 구역 */}
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.study_step2_name} {taskInfo.study_step3_name}</span></p>
                    <p>학습명 : <span>{taskInfo.study_part !== "-" ? taskInfo.study_part : ""} Unit{taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className="on"><a>DICTATION</a></li>
                </ul>
            </div>

            {/* 배경 이미지 및 컨텐츠를 담당하는 핵심 구역 (educontainer) */}
            <div className="educontainer" style={{ minHeight: 'calc(100vh - 100px)', background: "rgba(255,255,255,0.6)" }}>
                
                {/* 1. 인트로 (디자인 복구 & 이름 호출 추가 & handleStartStudy 연결) */}
                {mode === 'START' && (
                    <RSentenceStep1 
                        userId={userId} // 이름 호출용 전달
                        onStart={handleStartStudy} // 통일된 학습 시작 함수 연결
                    />
                )}
                
                {/* 2. 퀴즈 실전 */}
                {mode === 'QUIZ' && (
                    <RSentenceQuiz 
                        items={sentenceList} 
                        onLog={handleCaptureLog}
                        onComplete={handleSaveAndFinish} 
                    />
                )}

                {/* 3. 최종 결과창 */}
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
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; color: #007bff; font-size: 20px; }
                input, textarea, select { font-size: 16px !important; } /* 아이폰 자동 줌 방지 */
                #eduwrap { -webkit-overflow-scrolling: touch; overflow-y: auto; }
            `}</style>
        </div>
    );
};

export default RSentenceMain;