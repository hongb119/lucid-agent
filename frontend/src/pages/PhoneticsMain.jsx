import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// 컴포넌트 임포트
import PhoneticsIntro from './PhoneticsIntro';
import PhoneticsPractice from './PhoneticsPractice';
import PhoneticsFinish from './PhoneticsFinish';
import PhoneticsQuiz from './PhoneticsQuiz';
import PhoneticsQuizFinish from './PhoneticsQuizFinish';
import PhoneticsFinalQuiz from './PhoneticsFinalQuiz';
import PhoneticsRetry from './PhoneticsRetry';
import PhoneticsResult from './PhoneticsResult';

const PhoneticsMain = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const taskId = queryParams.get('task_id');
    const userId = queryParams.get('user_id');
    const branchCode = queryParams.get('branch_code');
    const initialReStudy = queryParams.get('re_study') || 'N';

    const [currentStep, setCurrentStep] = useState(1);
    const [taskData, setTaskData] = useState(null);
    const [phoneticsData, setPhoneticsData] = useState([]);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reStudy, setReStudy] = useState(initialReStudy);

    const audioRef = useRef(new Audio());

    // 1. 초기 데이터 및 CSS 로드
    useEffect(() => {
        const fetchAllData = async () => {
            if (!taskId) {
                setError("학습 정보(task_id)가 없습니다.");
                setLoading(false);
                return;
            }
            try {
                // CSS 동적 주입 (버전 관리를 통해 캐시 방지)
                const v = new Date().getTime();
                ["default.css", "content.css"].forEach(file => {
                    const linkId = `css-${file.replace('.', '-')}`;
                    if (!document.getElementById(linkId)) {
                        const link = document.createElement("link");
                        link.id = linkId;
                        link.rel = "stylesheet";
                        link.href = `/static/study/css/${file}?v=${v}`;
                        document.head.appendChild(link);
                    }
                });

                const res = await axios.get(`/api/phonetics/fetch`, {
                    params: { task_id: taskId, user_id: userId, re_study: reStudy },
                    withCredentials: true
                });

                if (res.data && res.data.result_code === '200') {
                    setPhoneticsData(res.data.phonetics_list || []);
                    const info = res.data.task_info || {};
                    setTaskData({
                        task_id: taskId,
                        user_id: userId,
                        branch_code: branchCode || info.branch_code || '',
                        re_study: reStudy,
                        re_study_no: info.re_study_no || 0,
                        bookName: info.study_step2_name || "LUCID PHONETICS",
                        subName: info.study_step3_name || "",
                        unit: info.study_unit || "0",
                        part: info.study_part || "",
                    });
                    setLoading(false);
                } else {
                    setError(res.data?.result_msg || '데이터 로딩 실패');
                    setLoading(false);
                }
            } catch (err) {
                setError('서버 연결 실패 (Network Error)');
                setLoading(false);
            }
        };
        fetchAllData();
    }, [taskId, userId, reStudy]);

    // 2. 최종 퀴즈 완료 후 처리
    const handleFinalQuizComplete = (results) => {
        const failList = results.filter(item => item.input_eng_pass === 'N');
        const failCount = failList.length;

        if (failCount > 0) {
            setReportData({ failCount, results });
            setCurrentStep(7); // Retry 화면으로 이동
        } else {
            fetchFinalReport();
            setCurrentStep(8); // 결과 리포트로 이동
        }
    };

    // 3. 재학습 처리 (PHP 로직 반영)
    const handleRetryProcess = () => {
        const nextReStudy = reStudy === 'N' ? 'Y' : 'X';
        setReStudy(nextReStudy);
        setCurrentStep(2); // Practice 단계로 회귀
    };

    const fetchFinalReport = async () => {
        try {
            const response = await axios.get(`/api/phonetics/results`, {
                params: { task_id: taskId, user_id: userId, re_study_no: taskData?.re_study_no || 0 },
                withCredentials: true
            });
            if (response.data.result_code === '200') {
                setReportData(response.data);
            }
        } catch (error) {
            console.error('리포트 조회 실패:', error);
        }
    };

    const handleExit = () => {
        if (window.opener && !window.opener.closed && window.opener.fnReload) {
            window.opener.fnReload();
        }
        window.close();
    };

    if (error) return <div className="error_box">{error}</div>;
    if (loading || !taskData) return <div className="loading_box">Loading...</div>;

    return (
        /* [중요] id="eduwrap"이 있어야 content.css의 기본 배경 이미지가 나타납니다. */
        <div id="eduwrap" style={{ touchAction: 'manipulation', minHeight: '100vh' }}>
            <div className="eduhead">
                <div className="hd_info">
                    <p>교재명 : <span>{taskData.bookName} {taskData.subName}</span></p>
                    <p>학습명 : <span>{taskData.part !== "-" ? taskData.part : ""} Unit{taskData.unit}</span></p>
                </div>
                <ul class="hd_btn">
			<li><a href="#">FLASHCARD</a></li>
			<li><a href="#">PHONETICS PRACTICE</a></li>
			<li><a href="#">QUIZ</a></li>
		       </ul>
            </div>

            {/* [배경 이미지 버그 수정 핵심]
                background 속성 대신 backgroundColor를 사용하여 CSS의 이미지를 덮지 않도록 합니다. 
            */}
            <div className="educontainer" style={{ 
                minHeight: 'calc(100vh - 100px)', 
                backgroundColor: currentStep === 1 ? "rgba(255,255,255,0.6)" : "transparent"
            }}>
                {currentStep === 1 && (
                    <PhoneticsIntro 
                        step1Name={taskData.bookName} 
                        onStart={() => setCurrentStep(2)} 
                    />
                )}
                
                {currentStep === 2 && (
                    <PhoneticsPractice 
                        items={phoneticsData} 
                        onComplete={() => setCurrentStep(3)} 
                    />
                )}

                {currentStep === 3 && (
                    <PhoneticsFinish onRetry={() => setCurrentStep(2)} onNext={() => setCurrentStep(4)} />
                )}

                {currentStep === 4 && (
                    <PhoneticsQuiz items={phoneticsData} onComplete={() => setCurrentStep(5)} />
                )}

                {currentStep === 5 && (
                    <PhoneticsQuizFinish onRetry={() => setCurrentStep(4)} onNext={() => setCurrentStep(6)} />
                )}

                {currentStep === 6 && (
                    <PhoneticsFinalQuiz 
                        items={phoneticsData} 
                        taskData={taskData}
                        onComplete={handleFinalQuizComplete} 
                    />
                )}

                {currentStep === 7 && (
                    <PhoneticsRetry 
                        failCount={reportData?.failCount || 0} 
                        onRetry={handleRetryProcess} 
                    />
                )}

                {currentStep === 8 && (
                    <PhoneticsResult reportData={reportData} onExit={handleExit} />
                )}
            </div>
     
        
        </div>
    );
};

export default PhoneticsMain;