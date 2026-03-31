import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import PatternDrill_Intro from './PatternDrill_Intro'; 
import PatternDrill_FlashCard from './PatternDrill_FlashCard';
import PatternDrill_Drills from './PatternDrill_Drills';
import PatternDrill_Unscramble from './PatternDrill_Unscramble';
import PatternDrill_SpeakingReport from './PatternDrill_SpeakingReport';
import PatternDrill_FinalResult from './PatternDrill_FinalResult';
import { AgentContext } from '../App'; 

const PatternDrill = () => {
    // [1] AI 에이전트 제어 컨텍스트
    const { triggerAgent } = useContext(AgentContext);

    // [2] URL 파라미터 추출
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code') || 'MAIN';
    const reStudy = queryParams.get('re_study') || 'N';
    const reStudyNo = parseInt(queryParams.get('re_study_no') || '0');

    // [3] 상태 관리
    const [mode, setMode] = useState('START'); 
    //const [mode, setMode] = useState('UNSCRAMBLE'); 
    const [contents, setContents] = useState([]);
    const [originalContents, setOriginalContents] = useState([]); 
    const [taskInfo, setTaskInfo] = useState(null);
    const [logs, setLogs] = useState([]); 
    const [aiSummary, setAiSummary] = useState("");
    const [drillStats, setDrillStats] = useState({ correct: 0, wrong: 0 });
    const [saveResponse, setSaveResponse] = useState(null); 

    // [4] 초기 데이터 및 CSS 로드
    useEffect(() => {
        const init = async () => {
            try {
                const cssFiles = ["default.css", "content.css", "lucid_study_standard.css"];
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

                const res = await axios.get(`/api/patterndrill/info`, { params: { task_id: taskId } });
                if (res.data && res.data.content_list) {
                    setContents(res.data.content_list);
                    setOriginalContents(res.data.content_list);
                    setTaskInfo(res.data.task_info);
                }
            } catch (err) { 
                console.error("데이터 로드 실패", err); 
            }
        };
        init();
    }, [taskId]);

    // [5] 학습 시작 핸들러
    const handleStartPatternDrill = () => {
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId, user_id: userId, branch_code: branchCode,
                re_study: reStudy, task_type: 'patterndrill'
            });
        }
        setMode('FLASHCARD'); 
    };

    // [6] 패턴드릴(스피킹) 완료 핸들러
    const handleDrillComplete = (speakingLogs) => {
        if (speakingLogs && speakingLogs.length > 0) {
            const correct = speakingLogs.filter(l => l.is_speaking_correct).length;
            setDrillStats({ correct, wrong: speakingLogs.length - correct });
            setLogs([...speakingLogs]); 
            setMode('REPORT'); 
        }
    };

    // [7] 최종 저장 및 결과창 이동 (중복 제거 및 괄호 교정 완료)
    const handleFinalSave = async (unscrambleLogs) => {
        // 백엔드 모델과 일치하도록 데이터 정제
        const finalLogs = originalContents.map((content) => {
            const sLog = logs.find(l => l.study_item_no === content.study_item_no);
            const uLog = unscrambleLogs.find(u => u.study_item_no === content.study_item_no);

            return {
                study_item_no: parseInt(content.study_item_no),
                student_transcript: String(sLog?.student_transcript || ""),
                is_speaking_correct: Boolean(sLog?.is_speaking_correct),
                unscramble_input: String(uLog?.unscramble_input || ""),
                is_unscramble_correct: Boolean(uLog?.is_unscramble_correct)
            };
        });

        console.log("🚀 최종 전송 데이터:", finalLogs);

        try {
            const res = await axios.post('/api/patterndrill/complete', {
                task_id: parseInt(taskId),
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                re_study_no: reStudyNo + 1,
                logs: finalLogs
            });
            
            if (res.data.result_code === "200") {
                setAiSummary(res.data.summary);
                setSaveResponse(res.data);
                setLogs(finalLogs);
                setMode('RESULT');
                
                if (window.opener && typeof window.opener.fnReload === 'function') {
                    window.opener.fnReload();
                }
            }
        } catch (err) { 
            console.error("❌ 저장 실패:", err.response?.data);
            alert("저장 실패"); 
        }
    };

    // [8] 재학습(RETRY) 핸들러
    const handleRetryFailed = () => {
        const failedItemNos = logs
            .filter(l => !l.is_unscramble_correct)
            .map(l => l.study_item_no);

        const retryList = originalContents.filter(item => failedItemNos.includes(item.study_item_no));

        if (retryList.length > 0) {
            setContents(retryList);
            setMode('UNSCRAMBLE');
        } else {
            setContents(originalContents);
            setMode('FLASHCARD');
        }
    };

    if (!taskInfo || originalContents.length === 0) return <div className="loading_box">Loading...</div>;

    return (
        <div id="eduwrap">
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskInfo.study_step2_name}</span></p>
                    <p>학습명 : <span>Unit {taskInfo.study_unit}</span></p>
                </div>
                <ul className="hd_btn">
                    <li className={['START', 'FLASHCARD', 'FLASHCARD_END'].includes(mode) ? 'on' : ''}><a>FLASHCARD</a></li>
                    <li className={['DRILL', 'REPORT'].includes(mode) ? 'on' : ''}><a>PATTERN DRILLS</a></li>
                    <li className={['UNSCRAMBLE', 'RESULT'].includes(mode) ? 'on' : ''}><a>UNSCRAMBLE</a></li>
                </ul>
            </div>

            <div className="educontainer" style={{ background: "rgba(255,255,255,0.6)", minHeight: 'calc(100vh - 100px)' }}>
                {mode === 'START' && (
                    <PatternDrill_Intro step1Name={taskInfo.study_step1_name} userId={userId} onStart={handleStartPatternDrill} />
                )}
                {mode === 'FLASHCARD' && (
                    <PatternDrill_FlashCard contents={contents} onComplete={() => setMode('FLASHCARD_END')} />
                )}
                {mode === 'FLASHCARD_END' && (
                    <div className="conbox1 w1">
                        <div className="speech">
                            <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                            <p className="bubble_tx">
                                <span className="tx_box">FLASHCARD 학습을 완료 했어요. <br/>다음 단계 학습을 계속하려면 NEXT 버튼을 클릭하세요.</span>
                            </p>
                        </div>
                        <div className="conbox3">
                            <div className="bigbtns">
                                <div className="wid50"><button className="bigb1" onClick={() => setMode('FLASHCARD')}><img src="/static/study/images/btn_big1.png" alt="" /> RETRY</button></div>
                                <div className="wid50"><button className="bigb2" onClick={() => setMode('DRILL')}><img src="/static/study/images/btn_big2.png" alt="" /> NEXT</button></div>
                            </div>
                        </div>
                    </div>
                )}
                {mode === 'DRILL' && (
                  <PatternDrill_Drills 
                   contents={contents} 
                   onComplete={handleDrillComplete} 
                   task_id={taskId}      // 추가
                   user_id={userId}      // 추가
                   branch_code={branchCode} // 추가
                   />
                )}
                {mode === 'REPORT' && (
                    <PatternDrill_SpeakingReport logs={logs} stats={drillStats} onNext={() => setMode('UNSCRAMBLE')} />
                )}
                {mode === 'UNSCRAMBLE' && (
                    <PatternDrill_Unscramble contents={contents} onComplete={handleFinalSave} />
                )}
                {mode === 'RESULT' && (
                    <PatternDrill_FinalResult 
                        aiSummary={aiSummary} 
                        failCount={saveResponse?.fail_count || 0} 
                        onRetry={handleRetryFailed} 
                    />
                )}
            </div>
            <style>{`
                .loading_box { display: flex; justify-content: center; align-items: center; height: 100vh; font-weight: bold; font-size: 20px; }
                #eduwrap { touch-action: manipulation; }
            `}</style>
        </div>
    );
};

export default PatternDrill;