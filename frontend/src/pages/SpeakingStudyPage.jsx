import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AgentContext } from '../App'; 
import SpeakingIntro from './SpeakingIntro';
import SpeakingMain from './SpeakingMain';
import SpeakingReport from './SpeakingReport';

const SpeakingStudyPage = () => {
    // 1. 에이전트 및 URL 파라미터 설정
    const { triggerAgent } = useContext(AgentContext);
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code');
    const reStudy = queryParams.get('re_study') || 'N';

    // 2. 상태 관리
    const [step, setStep] = useState(1); // 1: Shadowing, 2: Fluency
    const [viewMode, setViewMode] = useState('intro'); // intro, study, report
    const [itemArray, setItemArray] = useState([]);
    const [dayTaskView, setDayTaskView] = useState(null);
    const [fluencyResult, setFluencyResult] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // 🚩 [추가] 고도화된 로딩 메시지 상태
    const [loadingMsg, setLoadingMsg] = useState("");

    // [로직 추가] iOS/모바일 오디오 잠금 해제
    const unlockAudio = () => {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZRTU9O");
        silentAudio.play().then(() => {
            silentAudio.pause();
        }).catch(() => {});
    };

    // [버그 방지: 로그인 체크]
    useEffect(() => {
        if (!userId || !branchCode) {
            alert("로그인 정보가 없거나 지점 코드가 누락되었습니다. 다시 로그인해주세요.");
            return;
        }
    }, [userId, branchCode]);

    // 3. CSS 동적 로드 및 데이터 초기화
    useEffect(() => {
        const init = async () => {
            if (!taskId) {
                setLoading(false);
                return;
            }
            
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

                const res = await axios.get(`/api/speaking/info`, { 
                    params: { task_id: taskId } 
                });

                if (res.data && res.data.dayTaskView) {
                    setDayTaskView(res.data.dayTaskView);
                    setItemArray(res.data.studySentenceList || []);
                    console.log("✅ 데이터 로드 성공:", res.data.dayTaskView.study_step2_name);
                }
            } catch (e) {
                console.error("❌ 데이터 로드 실패:", e.response?.data || e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [taskId, userId, branchCode]);
    
    // 🚩 [고도화] 최종 저장 및 AI 분석 핸들러
    const handleFinish = async (analysisData, totalTime) => {
        if (!analysisData || !Array.isArray(analysisData) || analysisData.length === 0) {
            alert("분석된 데이터가 없습니다. 다시 시도해주세요.");
            return;
        }

        setLoading(true);
        try {
            // STEP 1: AI 피드백 생성
            setLoadingMsg("AI가 목소리를 정밀 분석하여 총평을 작성 중입니다...");
            const summaryPayload = { 
                results: analysisData.map(i => ({ 
                    study_eng: String(i.study_eng || ""), 
                    transcribed: String(i.transcribed || "") 
                })) 
            };
            
            const summaryRes = await axios.post('/api/speaking/final-summary', summaryPayload);
            const overallFeedback = summaryRes.data.summary || "학습이 완료되었습니다.";

            // STEP 2: 데이터 수치화
            setLoadingMsg("학습 지표(WPM/정답률)를 계산하고 있습니다...");
            const safeTime = totalTime > 0 ? totalTime : 1;
            const totalWords = analysisData.reduce((acc, cur) => acc + (cur.study_eng ? cur.study_eng.split(' ').length : 0), 0);
            const calculatedWpm = Math.round((totalWords / safeTime) * 60) || 0;
            const correctCount = analysisData.filter(i => i.transcribed && i.transcribed.trim() !== "").length;
            const accuracyRate = Math.round((correctCount / analysisData.length) * 100) || 0;
            const accuracyGrade = accuracyRate >= 90 ? "Excellent" : accuracyRate >= 70 ? "Good" : "Normal";

            // STEP 3: 서버 저장 및 리포트 갱신
            setLoadingMsg("결과를 서버에 기록하고 별점을 업데이트 중입니다...");
            const reportSavePayload = {
                task_id: parseInt(taskId) || 0,
                user_id: String(userId || ""),
                branch_code: String(branchCode || "MAIN"),
                accuracy: String(accuracyGrade),
                wpm: Number(calculatedWpm),
                duration: String(`${totalTime}초`),
                word_count: Number(totalWords),
                score: Number(accuracyRate),
                overall_feedback: String(overallFeedback),
                details: analysisData.map(r => ({
                    study_eng: String(r.study_eng || ""),
                    transcribed: String(r.transcribed || "")
                }))
            };

            const saveRes = await axios.post('/api/speaking/save-report', reportSavePayload);

            if (saveRes.data.result_code === "200" || saveRes.status === 200) {
                setLoadingMsg("학습 완료! 리포트를 구성합니다.");
                
                const finalResult = {
                    analysis: analysisData,
                    overall_feedback: overallFeedback,
                    wpm: calculatedWpm, 
                    duration: `${totalTime}초`, 
                    accuracy: accuracyGrade
                };

                // 약간의 지연을 주어 완료 메시지를 인지시킴
                setTimeout(() => {
                    setFluencyResult(finalResult); 
                    setViewMode('report');
                }, 800);
            } else {
                throw new Error("저장 실패");
            }
            
        } catch (err) {
            console.error("📍 [저장 오류]:", err.response?.data || err);
            alert("결과 저장 중 문제가 발생했습니다. 네트워크 상태를 확인해주세요.");
        } finally {
            // FINISH 모드로 바뀌면 상위 로딩박스에서 해제되도록 지연 처리
            setTimeout(() => {
                setLoading(false);
                setLoadingMsg("");
            }, 1000);
        }
    };

    // 학습 시작 핸들러
    const handleStartSpeaking = () => {
        unlockAudio();
        setViewMode('study');
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, task_type: 'speaking'
            });
        }
    };

    // 초기 데이터 로딩 화면
    if (loading && viewMode === 'intro') {
        return <div className="loading_box">데이터를 불러오는 중입니다...</div>;
    }

    return (
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}>
            {/* 🚩 [고도화] AI 분석 전용 로딩 오버레이 */}
            {loading && loadingMsg && (
                <div className="ai_loading_overlay">
                    <div className="ai_loading_content">
                        <div className="ai_scanner"></div>
                        <div className="spinner_ring"></div>
                        <p className="loading_text">{loadingMsg}</p>
                        <span className="loading_subtext">서버 상태에 따라 최대 10초가 소요될 수 있습니다.</span>
                    </div>
                </div>
            )}

            {/* 공통 헤더 */}
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{dayTaskView?.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit{dayTaskView?.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={step === 1 ? "on" : ""}><a>SHADOWING</a></li>
                    <li className={step === 2 ? "on" : ""}><a>FLUENCY</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ 
                minHeight: 'calc(100vh - 100px)', 
                background: viewMode === 'intro' ? "rgba(255,255,255,0.6)" : "none" 
            }}>
                {viewMode === 'intro' && (
                    <SpeakingIntro onStart={handleStartSpeaking} />
                )}

                {viewMode === 'study' && (
                    <SpeakingMain 
                        step={step}
                        itemArray={itemArray}
                        userId={userId}
                        taskId={taskId}
                        branchCode={branchCode}
                        onFinish={handleFinish}
                        onStepChange={setStep}
                    />
                )}

                {viewMode === 'report' && (
                    <SpeakingReport 
                        result={fluencyResult}
                        itemArray={itemArray}
                        onClose={() => window.close()}
                    />
                )}
            </div>

            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; font-size: 18px; color: #666; }
                
                /* AI 로딩 오버레이 스타일 */
                .ai_loading_overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255, 255, 255, 0.95);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 10000; backdrop-filter: blur(5px);
                }
                .ai_loading_content { text-align: center; }
                
                .spinner_ring {
                    width: 50px; height: 50px; border: 4px solid #f3f3f3;
                    border-top: 4px solid #6F6BE6; border-radius: 50%;
                    animation: spin 1s linear infinite; margin: 0 auto 20px;
                }
                
                .ai_scanner {
                    width: 150px; height: 3px; background: #eee;
                    margin: 0 auto 15px; position: relative; overflow: hidden;
                }
                .ai_scanner::after {
                    content: ''; position: absolute; left: -50%; width: 50%; height: 100%;
                    background: #6F6BE6; animation: scan 2s ease-in-out infinite;
                }

                .loading_text { font-size: 19px; font-weight: bold; color: #222; margin-bottom: 10px; }
                .loading_subtext { font-size: 13px; color: #aaa; }

                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes scan { 0% { left: -50%; } 100% { left: 100%; } }

                input, button { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; }
            `}</style>
        </div>
    );
};

export default SpeakingStudyPage;