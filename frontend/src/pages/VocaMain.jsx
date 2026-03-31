import React, { useState, useEffect, useRef, useContext } from 'react'; // 1. useContext 추가
import axios from 'axios';
import { AgentContext } from '../App'; // 2. App에서 만든 컨텍스트 임포트

import VocaIntro from './VocaIntro';
import VocaDictation from './VocaDictation';
import VocaFinish from './VocaFinish'; 
import VocaQuiz from './VocaQuiz'; 
import VocaTotalFinish from './VocaTotalFinish';

const VocaMain = () => {
    // 3. 에이전트 리모컨(triggerAgent) 가져오기
    const { triggerAgent } = useContext(AgentContext);

    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const reStudy = queryParams.get('re_study') || 'N';
    const branchCode = queryParams.get('branch_code'); // 추가

    const [mode, setMode] = useState('START'); 
    const [words, setWords] = useState([]);
    const [taskInfo, setTaskInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);

    const audioRef = useRef(new Audio());

    const unlockMobileAudio = () => {
        const audio = audioRef.current;
        audio.src = "data:audio/wav;base64,UklGRigAAABXQVZRTU9O"; 
        audio.play().then(() => {
            audio.pause();
            audio.currentTime = 0;
            console.log("🔊 Mobile Audio Unlocked");
        }).catch(e => console.warn("Audio unlock pending user interaction"));
    };

    // [수정 포인트] 학습 시작 시 에이전트 호출 함수
    const handleStartStudy = () => {
        // A. 기존 로직 (오디오 잠금 해제 및 모드 변경)
        unlockMobileAudio();
        setMode('STUDY');

        // B. 에이전트 인사 호출 (추가)
        if (triggerAgent) {
            triggerAgent({
            task_id: taskId,
            user_id: userId,
            branch_code: branchCode,
            re_study: reStudy,
            task_type: 'voca' // 보카 학습임을 알려줌
            });
        }
    };

    const handleExit = () => {
        try {
            if (window.opener && !window.opener.closed) {
                if (typeof window.opener.fnReload === 'function') {
                    window.opener.fnReload(); 
                }
            }
        } catch (e) { console.warn("부모창 업데이트 실패:", e); }
        window.close();
    };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await axios.get(`/api/voca/fetch-words`, {
                    params: { task_id: taskId, user_id: userId, re_study: reStudy }
                });

                if (res.data.status === "success") {
                    setWords(res.data.words || []);
                    const info = res.data.task_info || (res.data.words && res.data.words[0]) || {};
                    
                    setTaskInfo({
                        bookName: info.study_step2_name || info.book_name || "LUCID 교재",
                        subName: info.study_step3_name || info.step3_name || "",
                        unit: info.study_unit || info.unit || "0",
                        part: info.study_part || info.part || "",
                        re_study_no: info.re_study_no || 0
                    });
                }

                ["default.css", "content.css"].forEach(file => {
                    const link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                    document.head.appendChild(link);
                });
            } catch (err) {
                console.error("데이터 로드 실패:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [taskId, userId, reStudy]);

    // VocaMain.jsx 내의 handleQuizComplete 함수 수정

const handleQuizComplete = async (finalWords) => {
    setLoading(true);
    try {
        // [수정] 백엔드 SaveResultRequest 모델에 맞게 데이터 구조화
        const payload = {
            task_id: Number(taskId),
            user_id: userId,
            branch_code: branchCode, // 지점 코드 누락 방지
            re_study: reStudy,
            re_study_no: Number(taskInfo?.re_study_no || 0),
            inputArray: finalWords.map(w => ({
                study_no: w.study_no,
                study_item_no: w.study_item_no,
                study_eng: w.study_eng,
                study_kor: w.study_kor,
                input_eng_pass: w.input_eng_pass || 'N',
                input_kor_pass: w.input_kor_pass || 'N'
            }))
        };

        const res = await axios.post(`/api/voca/save-results`, payload);

        if (res.data.result_code === "200") {
            setReportData(res.data.report);
            setMode('TOTAL_FINISH');

        } else {
            alert("저장 실패: " + res.data.message);
        }
    } catch (err) {
        console.error("Save Error:", err);
        alert("학습 결과를 저장하는 중 오류가 발생했습니다.");
    } finally {
        setLoading(false); 
    }
  };
    
    if (loading && mode === 'START') return <div className="loading_box">학습 로드 중...</div>;
    if (!taskInfo) return null;

    return (
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}>
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.bookName} {taskInfo.subName}</span></p>
                    <p>학습명 : <span>{taskInfo.part !== "-" ? taskInfo.part : ""} Unit{taskInfo.unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={['START', 'STUDY', 'FINISH'].includes(mode) ? 'on' : ''}><a>FLASHCARD</a></li>
                    <li className={['QUIZ', 'TOTAL_FINISH'].includes(mode) ? 'on' : ''}><a>WORD PRACTICE</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ background: mode === 'START' ? "rgba(255,255,255,0.6)" : "none" }}>
                {mode === 'START' && (
                    // [수정] onStart를 새로 만든 handleStartStudy로 교체
                    <VocaIntro onStart={handleStartStudy} />
                )}
                
                {mode === 'STUDY' && (
                    <VocaDictation 
                        words={words} 
                        isReview={reStudy === 'R'}
                        onComplete={() => setMode('FINISH')} 
                    />
                )}

                {mode === 'FINISH' && (
                    <VocaFinish onRetry={() => setMode('STUDY')} onNext={() => setMode('QUIZ')} />
                )}
                
                {mode === 'QUIZ' && (
                    <VocaQuiz words={words} taskId={taskId} reStudy={reStudy} onComplete={handleQuizComplete} />
                )}

                {mode === 'TOTAL_FINISH' && (
                    <VocaTotalFinish 
                        reportData={reportData} 
                        onRetry={() => {
                            const currentUrl = new URL(window.location.href);
                            currentUrl.searchParams.set('re_study', 'R');
                            window.location.href = currentUrl.toString();
                        }} 
                        onExit={handleExit} 
                    />
                )}
            </div>
            
            <style>{`
                input, button { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; }
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; }
            `}</style>
        </div>
    );
};

export default VocaMain;