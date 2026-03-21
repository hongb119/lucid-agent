import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PhoneticsFinalQuiz = ({ items, taskData, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); // 0부터 시작
    const [quizResults, setQuizResults] = useState([]);
    const [saveFlag, setSaveFlag] = useState(true);
    const [showContent, setShowContent] = useState(false);
    const [passCnt, setPassCnt] = useState(0);

    const audioRef = useRef(null);

    // 초기 데이터 설정
    useEffect(() => {
        if (items && items.length > 0) {
            const initial = items.map(item => ({
                ...item,
                input_eng: '',
                input_eng_pass: 'N'
            }));
            setQuizResults(initial);
        }
    }, [items]);

    // 문항 시작 (PHP의 fnQuest)
    useEffect(() => {
        if (showContent && itemNo < items.length) {
            setSaveFlag(true);
            const currentItem = items[itemNo];
            
            if (audioRef.current) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${currentItem.study_mp3_file}`;
                audioRef.current.play();
            }
        }
    }, [showContent, itemNo]);

    // 정답 체크 (PHP의 fnAnswerChk)
    const handleAnswerClick = async (index, choiceText) => {
        if (!saveFlag) return;
        setSaveFlag(false);

        const choiceId = index + 1; // 1, 2, 3, 4
        const currentItem = items[itemNo];
        const isCorrect = currentItem.study_answer == choiceId;

        // 결과 업데이트
        const updatedResults = [...quizResults];
        updatedResults[itemNo].input_eng = choiceText;
        updatedResults[itemNo].input_eng_pass = isCorrect ? 'Y' : 'N';
        setQuizResults(updatedResults);

        if (isCorrect) {
            setPassCnt(prev => prev + 1);
            audioRef.current.src = "/static/study/suc.mp3";
        } else {
            audioRef.current.src = "/static/study/fail.mp3";
        }
        audioRef.current.play();

        // 서버 저장 (PHP의 fnStudySave)
        await saveProgress(updatedResults);

        // 다음 단계 이동 (2초 대기)
        setTimeout(() => {
            if (itemNo + 1 === items.length) {
                onComplete(updatedResults);
            } else {
                setItemNo(prev => prev + 1);
            }
        }, 2000);
    };

    // 데이터 저장 API 호출
    const saveProgress = async (results) => {
        try {
            await axios.post('/api/phonetics/save', {
                inputArray: results,
                task_id: taskData.task_id,
                user_id: taskData.user_id,
                re_study: taskData.re_study,
                re_study_no: taskData.re_study_no
            });
            // 부모창(opener) 리로드 로직은 리액트 환경에선 필요 시 추가
            if (window.opener && window.opener.fnReload) window.opener.fnReload();
        } catch (err) {
            console.error("저장 실패:", err);
        }
    };

    const handlePlayAudio = () => {
        if (audioRef.current) audioRef.current.play();
    };

    if (!showContent) {
        return (
            <div className="educontainer" style={{ background: 'rgba(255,255,255,0.6)' }}>
                <div className="start_page">
                    <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
                    <button type="button" onClick={() => setShowContent(true)}>START</button>
                </div>
            </div>
        );
    }

    const currentItem = items[itemNo];
    const distractors = currentItem.study_distractor.split("/");
    const labels = ["A", "B", "C", "D"];

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_tx">
                        <span className="tx_box">들려주는 음성을 잘 듣고 같은 것을 선택해보세요.</span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{items.length}</span></div>
            </div>

            <div className="conbox6">
                <div className="sp_btn">
                    <button type="button" onClick={handlePlayAudio}>
                        <img src="/static/study/images/btn01.png" alt="스피커" />
                    </button>
                </div>
                <div className="conb6_r wid100">
                    <ul id="quest-list">
                        {distractors.map((text, index) => {
                            const choiceId = index + 1;
                            const isSelected = quizResults[itemNo]?.input_eng === text;
                            const isCorrectAnswer = currentItem.study_answer == choiceId;
                            
                            // 클래스 결정 로직 (PHP의 .ok 및 오답 색상 변경 재현)
                            let btnClass = "";
                            if (!saveFlag) { // 답변 완료 후
                                if (isCorrectAnswer) btnClass = "ok";
                                else if (isSelected) btnClass = "wrong"; // 오답 선택 시 강조
                            }

                            return (
                                <li key={index} className={btnClass} onClick={() => handleAnswerClick(index, text)}>
                                    <button type="button" disabled={!saveFlag}>
                                        <span>{labels[index]}</span> {text}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            <audio ref={audioRef} />
            <style jsx>{`
                .ok button { background: #28a745 !important; color: white !important; }
                .wrong button { background: #90919A !important; color: white !important; border-color: #90919A !important; }
            `}</style>
        </div>
    );
};

export default PhoneticsFinalQuiz;