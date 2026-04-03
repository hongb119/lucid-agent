import React, { useState, useEffect, useRef,useContext } from 'react';
import axios from 'axios';
import DictaIntro from './DictaIntro';
import DictaScramble from './DictaScramble';
import DictaFinish from './DictaFinish';
import DictaQuiz from './DictaQuiz';
import DictaTotalFinish from './DictaTotalFinish';
import { AgentContext } from '../App'; // 2. App에서 만든 컨텍스트 임포트

const DictaMain = () => {
    // 3. 에이전트 리모컨(triggerAgent) 가져오기
    const { triggerAgent } = useContext(AgentContext);
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';
    const branchCode = queryParams.get('branch_code'); // 지점 코드 추출

    const [mode, setMode] = useState('START'); 
    //const [mode, setMode] = useState('QUIZ');
    const [scrambleWords, setScrambleWords] = useState([]); 
    const [quizWords, setQuizWords] = useState([]);         
    const [taskInfo, setTaskInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);

    const [trackingLogs, setTrackingLogs] = useState([]); 
    const [studyStartTime, setStudyStartTime] = useState(null);

    // [추가] 모바일/iOS 오디오 잠금 해제용 Ref
    const audioContextRef = useRef(null);
     // [핵심] 환경 변수 로드: 로컬에선 8080 주소를, 서버에선 빈 값을 가져옵니다.
    const API_BASE = import.meta.env.VITE_API_URL || '';

    // [로직 추가] iOS Safari 오디오 잠금 해제 함수
    const unlockAudio = () => {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZRTU9O");
        silentAudio.play().then(() => {
            silentAudio.pause();
            console.log("🔊 Mobile Audio Unlocked");
        }).catch(() => {});
    };
    // [로직 추가] 학습 시작 시 에이전트를 호출하는 공통 핸들러
    const handleStartDictation = () => {
        // A. 기존 로직 실행
        unlockAudio();
        setMode('SCRAMBLE');
        setStudyStartTime(Date.now());

        // B. 에이전트 인사 호출 (추가)
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId,
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                task_type: 'dictation' // AI가 받아쓰기임을 인지하도록 타입 전달
            });
        }
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

                // [3] API 호출 수정: 하드코딩된 http 주소와 8080 포트를 제거하고 API_BASE 적용
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

    const handleSaveAndFinish = async (finalInputArray, lastLog) => {
       
    setLoading(true);

    try {
        const totalDuration = studyStartTime ? Math.floor((Date.now() - studyStartTime) / 1000) : 0;

        // 1. 현재 퀴즈 세션에 해당하는 문항 번호들 추출 (예: [1,2,3,4,5,6,7,8,9,10])
        const currentItemNos = quizWords.map(w => Number(w.study_item_no));

        // 2. [핵심] 기존 상태(trackingLogs)에 마지막 로그(lastLog)를 수동으로 결합
        // 리액트 state 업데이트 속도보다 함수 실행이 빠를 때 발생하는 누락을 방지합니다.
        let fullLogs = [...trackingLogs];
        if (lastLog) {
            // 중복 방지: 이미 목록에 있는지 확인 후 추가
            const exists = fullLogs.some(l => Number(l.study_item_no) === Number(lastLog.study_item_no));
            if (!exists) {
                fullLogs.push(lastLog);
            }
        }

        // 3. 현재 퀴즈 문항 번호와 일치하는 로그만 필터링 (틀린 문제 다시 풀기 대응)
        const filteredLogs = fullLogs.filter(log => 
            currentItemNos.includes(Number(log.study_item_no))
        );

        console.log("📊 최종 필터링된 로그 개수:", filteredLogs.length);

        // 4. 백엔드 규격에 맞게 데이터 정제 (inputArray)
        const cleanedInputArray = (finalInputArray || []).map((item, idx) => ({
            study_no: Number(item.study_no || taskInfo?.study_no || 0),
            study_item_no: Number(item.study_item_no || (idx + 1)),
            input_eng: String(item.input_eng || "-"),
            input_eng_pass: String(item.input_eng_pass || "N")
        }));

        // 5. 백엔드 규격에 맞게 데이터 정제 (tracking_logs)
        const cleanedLogs = filteredLogs.map(log => ({
            study_item_no: Number(log.study_item_no),
            try_count: Number(log.try_count || 1),
            taken_time: Number(log.taken_time || 0),
            is_hint_used: String(log.is_hint_used || "N")
        }));

        // 6. 전송 페이로드 구성
        const payload = {
            task_id: Number(taskId),
            user_id: String(userId),
            re_study: String(reStudy),
            re_study_no: Number(taskInfo?.re_study_no || 0),
            inputArray: cleanedInputArray,
            tracking_logs: cleanedLogs,
            total_time: totalDuration
        };

        console.log("📤 서버로 보낼 최종 데이터:", payload);

        // 7. API 호출
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
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}> {/* [추가] 모바일 더블탭 줌 방지 */}
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
                        // 🚀 [수정] 아래 익명 함수 대신 미리 만들어둔 handleStartDictation을 연결합니다.
                        onStart={handleStartDictation} 
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

            {/* [스타일 추가] 모바일 최적화 레이아웃 */}
            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; }
                input, button { font-size: 16px !important; } /* 아이폰 줌 방지 필수 폰트 크기 */
                #eduwrap { -webkit-overflow-scrolling: touch; }
            `}</style>
        </div>
    );
};

export default DictaMain;