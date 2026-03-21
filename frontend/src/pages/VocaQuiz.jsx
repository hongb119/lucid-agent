import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VocaQuiz = ({ words, taskId, reStudy, onComplete }) => {
    // PHP 변수들처럼 관리
    const [itemNo, setItemNo] = useState(0); 
    const [engList, setEngList] = useState([]); 
    const [korList, setKorList] = useState([]); 
    const [timeLeft, setTimeLeft] = useState(15);
    const [playState, setPlayState] = useState(true); 
    const [pass, setPass] = useState({ eng: false, kor: false });
    const [quizResults, setQuizResults] = useState([]);

    const audioRef = useRef(null);
    const timerRef = useRef(null);

    // [핵심] 현재 단어 데이터를 가져오는 함수 (인덱스 초과 방지)
    const getCurWord = (idx) => (words && words[idx]) ? words[idx] : null;

    // 초기화 (PHP의 $(function(){}))
    useEffect(() => {
        if (words && words.length > 0 && quizResults.length === 0) {
            setQuizResults(words.map(w => ({ ...w, input_eng_pass: 'N', input_kor_pass: 'N' })));
            // 약간의 지연을 주어 상태 안정화 후 첫 문제 시작
            setTimeout(() => fnQuest(0), 100);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [words.length]);

    // PHP의 fnQuest() 역할: 다음 문제를 완전히 준비하고 화면을 띄움
    const fnQuest = async (no) => {
        const targetWord = getCurWord(no);
        if (!targetWord) return;

        try {
            // 이전 타이머 정리
            if (timerRef.current) clearInterval(timerRef.current);
            
            setPlayState(true);
            setPass({ eng: false, kor: false });
            setTimeLeft(15);

            // API로 오답 리스트 가져오기
            const res = await axios.post(`/api/voca/studyPVocaStepRandom`, {
                study_eng: targetWord.study_eng
            });

            if (res.data.result_code === "200") {
                let combined = [...res.data.studyVocaRandomList, targetWord];
                const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
                
                setEngList(shuffle(combined));
                setKorList(shuffle(combined));
                
                // 데이터 준비가 완전히 끝난 후 인덱스 변경 (이 시점에 화면이 바뀜)
                setItemNo(no);
                
                // 약간의 지연 후 음성 재생 (상태 안정화)
                setTimeout(() => {
                    fnMp3Play(targetWord);
                    fnTimer();
                }, 200);
            }
        } catch (err) {
            console.error("문항 로드 실패:", err);
        }
    };

    const fnTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOut = () => {
        setPass({ eng: true, kor: true });
        // PHP 원본: 타임아웃 시 음성 다시 재생 후 정답 노출
        fnMp3Play();
        setTimeout(() => fnNextStep(), 1500);
    };

    const fnMp3Play = (wordObj) => {
        const target = wordObj || getCurWord(itemNo);
        if (!audioRef.current || !target?.study_mp3_file) return;

        try {
            // 현재 재생 중인 음성과 동일하면 무시
            if (audioRef.current.src.includes(target.study_mp3_file) && !audioRef.current.paused) {
                return;
            }
            
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            
            setPlayState(true);
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${target.study_mp3_file}`;
            audioRef.current.play().catch(e => console.log("재생 중단:", e.message));
        } catch (error) {
            console.error("음성 재생 오류:", error);
        }
    };

    // PHP의 fnMp3Stop() 역할: 음성이 끝나면 다음 문제로 자동 진행
    const handleAudioEnd = () => {
        setPlayState(false);
        // PHP 원본: 음성이 끝나면 다음 문제로 진행 (단, 정답을 맞혔을 때만)
        if (pass.eng && pass.kor) {
            if (itemNo + 1 < words.length) {
                setTimeout(() => fnQuest(itemNo + 1), 1000);
            } else {
                setTimeout(() => onComplete(quizResults), 1000);
            }
        }
    };

    // PHP의 fnInputEng / fnInputKor 통합
    const checkAnswer = (type, val) => {
        if (playState || timeLeft === 0) return;

        const currentWord = getCurWord(itemNo);
        const isCorrect = type === 'eng' ? val === currentWord.study_eng : val === currentWord.study_kor;

        if (isCorrect) {
            const updatedResults = [...quizResults];
            if (type === 'eng') updatedResults[itemNo].input_eng_pass = 'Y';
            if (type === 'kor') updatedResults[itemNo].input_kor_pass = 'Y';
            setQuizResults(updatedResults);

            // 정답 효과음
            try {
                audioRef.current.src = "/static/study/suc.mp3";
                audioRef.current.play().catch(() => {});
            } catch (e) {}
            
            setPass(prev => {
                const newState = { ...prev, [type]: true };
                if (newState.eng && newState.kor) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setTimeout(() => fnNextStep(updatedResults), 1000);
                }
                return newState;
            });
        } else {
            // 오답 효과음
            try {
                audioRef.current.src = "/static/study/fail.mp3";
                audioRef.current.play().catch(() => {});
            } catch (e) {}
        }
    };

    // PHP의 fnNextStep 역할
    const fnNextStep = (finalData) => {
        // 타이머 정리
        if (timerRef.current) clearInterval(timerRef.current);
        
        if (itemNo + 1 < words.length) {
            fnQuest(itemNo + 1); // 다음 문제 호출
        } else {
            onComplete(finalData || quizResults); // 저장 페이지로 이동
        }
    };

    // 현재 단어 데이터가 없으면 아무것도 안 그림 (안전 가드)
    if (!getCurWord(itemNo)) return null;

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">스피커 아이콘을 클릭하여 음성을 듣고 영어 단어와 뜻을 선택하세요.</span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            <div className="conbox4">
                <div className="sp_btn">
                    <button 
                        type="button" 
                        onClick={() => {
                            // 수동 클릭 시에만 재생 (자동 재생과 중복 방지)
                            if (!playState) {
                                fnMp3Play();
                            }
                        }}
                        style={{
                            opacity: playState ? 0.6 : 1,
                            cursor: playState ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <img src="/static/study/images/btn01.png" alt="스피커" />
                    </button>
                </div>
                <div className="timer">
                    <p style={{ fontSize: '80px', fontWeight: 'bold', color: timeLeft < 6 ? '#ef503a' : '#000' }}>{timeLeft}</p>
                </div>
            </div>

            <div className="conbox5">
                <div className="box5_1">
                    <div className="tx">영어</div>
                    <ul>
                        {engList.map((v, i) => (
                            <li key={i} className={`btn ${(pass.eng && v.study_eng === getCurWord(itemNo).study_eng) ? 'ok' : ''}`}
                                onClick={() => checkAnswer('eng', v.study_eng)}>
                                <button type="button">{v.study_eng}</button>
                                {(pass.eng && v.study_eng === getCurWord(itemNo).study_eng) && <span className="okicon"><img src="/static/study/images/icon03.png" alt="" /></span>}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="box5_1 tx_kor">
                    <div className="tx">한글</div>
                    <ul>
                        {korList.map((v, i) => (
                            <li key={i} className={`btn ${(pass.kor && v.study_kor === getCurWord(itemNo).study_kor) ? 'ok' : ''}`}
                                onClick={() => checkAnswer('kor', v.study_kor)}>
                                <button type="button">{v.study_kor}</button>
                                {(pass.kor && v.study_kor === getCurWord(itemNo).study_kor) && <span className="okicon"><img src="/static/study/images/icon03.png" alt="" /></span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <audio ref={audioRef} onEnded={handleAudioEnd} />
        </div>
    );
};

export default VocaQuiz;