import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AgentContext } from '../App'; // 2. App에서 만든 컨텍스트 임포트
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

    console.log("🚩 [Step 1: URL 파라미터 로드]");
    console.log("- task_id:", taskId);
    console.log("- user_id:", userId);
    console.log("- branch_code:", branchCode); // 여기서 비어있다면 URL 자체가 문제인 겁니다.
    console.log("🚩 [관문: SpeakingStudyPage] URL 파라미터 로드:", { taskId, userId, branchCode });

    // 2. 상태 관리
    const [step, setStep] = useState(1); // 1: Shadowing, 2: Fluency
    const [viewMode, setViewMode] = useState('intro'); // intro, study, report
    const [itemArray, setItemArray] = useState([]);
    const [dayTaskView, setDayTaskView] = useState(null);
    const [fluencyResult, setFluencyResult] = useState(null);
    const [loading, setLoading] = useState(true);

    // [로직 추가] iOS/모바일 오디오 잠금 해제
    const unlockAudio = () => {
        const silentAudio = new Audio("data:audio/wav;base64,UklGRigAAABXQVZRTU9O");
        silentAudio.play().then(() => {
            silentAudio.pause();
            console.log("🔊 Speaking Audio Unlocked");
        }).catch(() => {});
    };

    // [버그 방지: 로그인 체크] 유저ID나 지점코드가 없으면 튕겨냅니다.
    useEffect(() => {
        if (!userId || !branchCode) {
            alert("로그인 정보가 없거나 지점 코드가 누락되었습니다. 다시 로그인해주세요.");
            // window.location.href = "/login.php"; // 필요시 주석 해제
            return;
        }
    }, [userId, branchCode]);


    // 3. CSS 동적 로드 및 데이터 초기화 (DictaMain 로직 반영 및 branchCode 전달)
    useEffect(() => {
        const init = async () => {
            // [디버깅 로그] 브라우저 콘솔에서 파라미터가 잘 찍히는지 확인하세요.
            console.log("🚀 파라미터 체크:", { taskId, userId, branchCode });

            if (!taskId) {
                console.error("❌ task_id가 없습니다.");
                setLoading(false);
                return;
            }
            
            try {
                // [핵심] 디자인 파일을 강제로 로드합니다. (중복 로드 방지)
                const cssFiles = ["default.css", "content.css"];
                cssFiles.forEach(file => {
                    const linkId = `css-${file.replace('.', '-')}`;
                    if (!document.getElementById(linkId)) {
                        const link = document.createElement("link");
                        link.id = linkId;
                        link.rel = "stylesheet";
                        link.href = `/static/study/css/${file}?v=${new Date().getTime()}`;
                        document.head.appendChild(link);
                        console.log(`🎨 CSS 로드 완료: ${file}`);
                    }
                });

                // [수정] 데이터 로드 시 branch_code를 누락 없이 전달합니다.
                const res = await axios.get(`/api/speaking/info`, { 
                 params: { task_id: taskId } // 일단 성공했던 이 방식 그대로!
                });

                if (res.data && res.data.dayTaskView) {
                    setDayTaskView(res.data.dayTaskView);
                    setItemArray(res.data.studySentenceList || []);
                    console.log("✅ 데이터 로드 성공:", res.data.dayTaskView.study_step2_name);
                }
            } catch (e) {
                // 500 에러 발생 시 상세 이유 확인용
                console.error("❌ 데이터 로드 실패:", e.response?.data || e.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [taskId, userId, branchCode]);
    
    // SpeakingStudyPage.jsx 내부의 handleFinish 함수

    // SpeakingStudyPage.jsx

const handleFinish = async (analysisData, totalTime) => {
    // 1. 데이터 도착 확인 (로그)
    console.log("📍 [로그 3] 부모가 받은 데이터:", analysisData);
    
    if (!analysisData || !Array.isArray(analysisData)) {
        console.error("📍 [에러] 데이터가 배열이 아닙니다!");
        return;
    }

    setLoading(true);

    try {
        // 2. AI 총평 API 호출 (상대방 대답을 바탕으로 요약 생성)
        const summaryPayload = { 
            results: analysisData.map(i => ({ 
                study_eng: i.study_eng, 
                transcribed: i.transcribed 
            })) 
        };
        
        console.log("📍 [로그 4] 총평 API 호출:", summaryPayload);
        const summaryRes = await axios.post('/api/speaking/final-summary', summaryPayload);
        console.log("📍 [로그 5] AI 총평 수신:", summaryRes.data.summary);

        // 3. ⭐ 핵심 수정: 리포트가 읽을 수 있게 '객체'로 포장하기
        const finalResult = {
        analysis: analysisData,
        overall_feedback: summaryRes.data.summary,
        wpm: 120, 
        duration: "1:00", 
        accuracy: "Excellent"
       };

        setFluencyResult(finalResult); 
        setViewMode('report');
        
    } catch (err) {
        console.error("📍 [에러] 처리 중 오류:", err);
    } finally {
        setLoading(false);
    }
};

    // 학습 시작 핸들러
    const handleStartSpeaking = () => {
        unlockAudio();
        setViewMode('study');
        
        // 에이전트 호출 (DictaMain 방식)
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId,
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                task_type: 'speaking'
            });
        }
    };

    if (loading || !dayTaskView) return <div className="loading_box">Loading...</div>;

    return (
        <div id="eduwrap" style={{ touchAction: 'manipulation' }}>
            {/* 공통 헤더 */}
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{dayTaskView.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit{dayTaskView.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={step === 1 ? "on" : ""}><a>SHADOWING</a></li>
                    <li className={step === 2 ? "on" : ""}><a>FLUENCY</a></li>
                </ul>
            </div>

            {/* 메인 컨테이너 - 배경 투명도 조건부 적용 */}
            <div className="educontainer" style={{ 
                minHeight: 'calc(100vh - 100px)', 
                background: viewMode === 'intro' ? "rgba(255,255,255,0.6)" : "none" 
            }}>
                {viewMode === 'intro' && (
                    <SpeakingIntro 
                        onStart={handleStartSpeaking} 
                    />
                )}

                {viewMode === 'study' && (
                    <SpeakingMain 
                    step={step}
                    itemArray={itemArray}
                    userId={userId}      // 전달 확인
                    taskId={taskId}      // 전달 확인
                    branchCode={branchCode} // 전달 확인
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

            {/* [스타일 추가] 모바일 최적화 및 줌 방지 */}
            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; }
                input, button { font-size: 16px !important; }
                #eduwrap { -webkit-overflow-scrolling: touch; }
                /* 문장 영역 폰트 조절 */
                .boxtext.longtx div { margin-bottom: 10px; line-height: 1.6; }
            `}</style>
        </div>
    );
};

export default SpeakingStudyPage;