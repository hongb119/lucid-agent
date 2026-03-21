import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import PatternDrill_Intro from './PatternDrill_Intro'; 
import PatternDrill_FlashCard from './PatternDrill_FlashCard';
import PatternDrill_Drills from './PatternDrill_Drills';
import PatternDrill_Unscramble from './PatternDrill_Unscramble';
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

    // [3] 상태 관리 (기능 누락 없음)
    const [mode, setMode] = useState('START'); 
    const [contents, setContents] = useState([]);
    const [taskInfo, setTaskInfo] = useState(null);
    const [logs, setLogs] = useState([]); 
    const [aiSummary, setAiSummary] = useState("");
    const [drillStats, setDrillStats] = useState({ correct: 0, wrong: 0 });
    const [unscrambleStats, setUnscrambleStats] = useState({ correct: 0, wrong: 0 });

    // [4] 초기 데이터 및 CSS 로드
    useEffect(() => {
        const init = async () => {
            try {
                // 표준 CSS 파일 로드
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

                // 학습 데이터 로드
                const res = await axios.get(`/api/patterndrill/info`, { params: { task_id: taskId } });
                if (res.data) {
                    setContents(res.data.content_list || []);
                    setTaskInfo(res.data.task_info);
                }
            } catch (err) { 
                console.error("데이터 로드 실패", err); 
            }
        };
        init();
    }, [taskId]);

    // [5] 학습 시작 핸들러 (에이전트 인사 + 모드 변경)
    const handleStartPatternDrill = () => {
        if (triggerAgent) {
            triggerAgent({
                task_id: taskId,
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                task_type: 'patterndrill'
            });
        }
        setMode('FLASHCARD'); 
    };

    // [6] 패턴드릴(스피킹) 완료 시 리포트로 이동
    const handleDrillComplete = (speakingLogs) => {
        const correct = speakingLogs.filter(l => l.is_speaking_correct).length;
        setDrillStats({ correct, wrong: speakingLogs.length - correct });
        setLogs(speakingLogs);
        setMode('REPORT'); 
    };

    // [7] 최종 저장 및 결과창 이동 (언스크램블 데이터 병합)
    const handleFinalSave = async (unscrambleLogs, uStats) => {
        setUnscrambleStats(uStats);
        const finalLogs = logs.map((sLog, idx) => ({
            ...sLog,
            unscramble_input: unscrambleLogs[idx]?.unscramble_input || "",
            is_unscramble_correct: unscrambleLogs[idx]?.is_unscramble_correct || false
        }));

        try {
            const res = await axios.post('/api/patterndrill/complete', {
                task_id: taskId,
                user_id: userId,
                branch_code: branchCode,
                re_study: reStudy,
                re_study_no: reStudyNo + 1,
                logs: finalLogs
            });
            setAiSummary(res.data.summary);
            setMode('RESULT');
        } catch (err) { 
            alert("저장 실패"); 
        }
    };

    if (!taskInfo || contents.length === 0) return <div className="loading_box">Loading...</div>;

    return (
        <div id="eduwrap">
            {/* 상단 헤더 정보 구역 */}
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

            {/* 배경 이미지 및 컨텐츠를 담당하는 핵심 구역 (educontainer) */}
            <div className="educontainer" style={{ background: "rgba(255,255,255,0.6)", minHeight: 'calc(100vh - 100px)' }}>
                
                {/* 1. 인트로 (배경 유지를 위해 educontainer 내부에 배치) */}
                {mode === 'START' && (
                    <PatternDrill_Intro 
                        step1Name={taskInfo.study_step1_name} 
                        userId={userId} 
                        onStart={handleStartPatternDrill} 
                    />
                )}

                {/* 2. 플래시카드 */}
                {mode === 'FLASHCARD' && (
                    <PatternDrill_FlashCard contents={contents} onComplete={() => setMode('FLASHCARD_END')} />
                )}

                {/* 3. 플래시카드 완료 브릿지 */}
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

                {/* 4. 패턴드릴(스피킹 실전) */}
                {mode === 'DRILL' && (
                    <PatternDrill_Drills contents={contents} onComplete={handleDrillComplete} />
                )}

                {/* 5. 패턴드릴 결과 리포트 */}
                {mode === 'REPORT' && (
                    <div className="result_page" style={{textAlign:'center', padding:'30px'}}>
                        <div className="boxline" style={{background:'#fff', padding:'40px', borderRadius:'30px', border:'2px solid #007bff'}}>
                            <h2 style={{fontSize:'28px', color:'#333', marginBottom:'20px'}}>스피킹 분석 리포트</h2>
                            <div style={{display:'flex', justifyContent:'center', gap:'30px', marginBottom:'30px'}}>
                                <div style={{background:'#e3f2fd', padding:'20px', borderRadius:'15px', width:'150px'}}>
                                    <p style={{color:'#2196f3'}}>정확함</p>
                                    <p style={{fontSize:'32px', fontWeight:'bold'}}>{drillStats.correct}</p>
                                </div>
                                <div style={{background:'#ffebee', padding:'20px', borderRadius:'15px', width:'150px'}}>
                                    <p style={{color:'#f44336'}}>미흡함</p>
                                    <p style={{fontSize:'32px', fontWeight:'bold'}}>{drillStats.wrong}</p>
                                </div>
                            </div>
                            <button className="go_btn" onClick={() => setMode('UNSCRAMBLE')}>UNSCRAMBLE 시작</button>
                        </div>
                    </div>
                )}

                {/* 6. 언스크램블 */}
                {mode === 'UNSCRAMBLE' && (
                    <PatternDrill_Unscramble contents={contents} onComplete={handleFinalSave} />
                )}

                {/* 7. 최종 결과창 */}
                {mode === 'RESULT' && (
                    <div className="result_page" style={{textAlign:'center', padding:'30px'}}>
                        <div className="boxline" style={{background:'#fff', padding:'40px', borderRadius:'30px', border:'2px solid #007bff'}}>
                            <img src="/static/study/images/img_logo.png" alt="Finish" style={{maxWidth:'180px', marginBottom:'20px'}} />
                            <div className="feedbackBoxStyle" style={{background:'#f8f9fa', padding:'25px', borderRadius:'15px', marginBottom:'30px'}}>
                                <p style={{fontSize:'18px', color:'#555', lineHeight:'1.6'}}>{aiSummary}</p>
                            </div>
                            <div style={{display:'flex', justifyContent:'center', gap:'15px'}}>
                                <button className="go_btn" style={{background:'#6c757d'}} onClick={() => window.location.reload()}>다시하기</button>
                                <button className="go_btn" onClick={() => window.close()}>학습 종료</button>
                            </div>
                        </div>
                    </div>
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