import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VocaQuiz = ({ words, taskId, reStudy, onComplete }) => {
    // --- [1] 상태 관리 ---
    const [itemNo, setItemNo] = useState(0); 
    const [engList, setEngList] = useState([]); 
    const [korList, setKorList] = useState([]); 
    const [timeLeft, setTimeLeft] = useState(15);
    const [playState, setPlayState] = useState(true); 
    const [pass, setPass] = useState({ eng: false, kor: false });
    const [quizResults, setQuizResults] = useState([]);
    const [isNextLoading, setIsNextLoading] = useState(false);

    // --- [2] Refs ---
    const audioRef = useRef(null);
    const timerRef = useRef(null);
    const curItemNoRef = useRef(0);
    const forceNextTimeoutRef = useRef(null);

    // --- [3] 유틸리티 함수 (ReferenceError 방지를 위해 상단 배치) ---
    const getCurWord = (idx) => (words && words[idx]) ? words[idx] : null;

    // 오디오 중단 및 초기화
    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = "";
        }
    };

    // [수정] 3. fnMp3Play: 에러 발생 시 playState를 풀어서 멈춤 방지
    const fnMp3Play = (wordObj) => {
        const target = wordObj || getCurWord(curItemNoRef.current);
        if (!audioRef.current || !target?.study_mp3_file) {
            setPlayState(false);
            return;
        }

        try {
            stopAudio();
            setPlayState(true);
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${target.study_mp3_file}`;
            
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.warn("Audio play failed:", e.message);
                    setPlayState(false); // 재생 실패 시 상태 해제하여 멈춤 방지
                });
            }
        } catch (error) {
            setPlayState(false);
        }
    };

    // [3] handleTimeOut 수정: 강제 이동 예약을 Ref에 저장
    const handleTimeOut = () => {
        const targetIdx = curItemNoRef.current;
        if (pass.eng && pass.kor) return;

        const currentWord = words[targetIdx];
        if (!currentWord) return;

        setPass({ eng: true, kor: true });

        setQuizResults(prev => {
            const base = (prev && prev.length > 0) ? prev : words.map(w => ({ ...w, input_eng_pass: 'N', input_kor_pass: 'N' }));
            const updated = [...base];
            if (updated[targetIdx]) {
                updated[targetIdx] = { ...updated[targetIdx], input_eng_pass: 'N', input_kor_pass: 'N' };
            }
            return updated;
        });

        stopAudio();
        fnMp3Play(currentWord);

        // 🚩 강제 이동 예약을 Ref에 담아둡니다. (나중에 취소할 수 있도록)
        if (forceNextTimeoutRef.current) clearTimeout(forceNextTimeoutRef.current);
        forceNextTimeoutRef.current = setTimeout(() => {
            if (!isNextLoading) {
                console.log(`⏰ [문항 ${targetIdx}] 오디오 대기 초과 -> 강제 이동`);
                handleAudioEnd(); 
            }
        }, 3500); // 3.5초 대기
    };


    // [수정] fnTimer: 중복 실행을 "물리적"으로 차단
    const fnTimer = () => {
        // 🚩 1. 이미 타이머가 돌고 있다면, 새로 만들지 않고 기존 것을 유지하거나 죽이고 새로 만듭니다.
        if (timerRef.current) {
            console.log("⚠️ 이미 타이머가 구동 중입니다. 기존 타이머를 초기화합니다.");
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        
        console.log(`⏱️ 타이머 구동 시작 - 대상 문항: ${curItemNoRef.current}`);

        // 🚩 2. 타이머를 생성함과 동시에 ref에 즉시 할당
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                // 🚩 3. 방어 코드: 만약 정답을 맞춘 상태라면 즉시 자폭
                if (pass.eng && pass.kor) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    return prev;
                }

                if (prev <= 1) {
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    handleTimeOut(curItemNoRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

   const fnQuest = async (no) => {
        // 🚩 [핵심] 새로운 문제를 불러오기 전에 무조건 기존 타이머를 NULL로 초기화
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null; 
        }
        if (forceNextTimeoutRef.current) {
            clearTimeout(forceNextTimeoutRef.current);
            forceNextTimeoutRef.current = null;
        }

        const targetWord = getCurWord(no);
        if (!targetWord) return;

        try {
            setIsNextLoading(false); 
            setPass({ eng: false, kor: false });
            setTimeLeft(15);
            curItemNoRef.current = no; 
            setItemNo(no);

            const res = await axios.post(`/api/voca/studyPVocaStepRandom`, {
                study_eng: targetWord.study_eng
            });

            if (res.data.result_code === "200") {
                setEngList([...res.data.studyVocaRandomList, targetWord].sort(() => Math.random() - 0.5));
                setKorList([...res.data.studyVocaRandomList, targetWord].sort(() => Math.random() - 0.5));
                
                stopAudio();
                
                // 🚩 데이터 렌더링 시간을 충분히 준 뒤 타이머 시작
                setTimeout(() => {
                    fnMp3Play(targetWord);
                    fnTimer(); 
                }, 500); 
            }
        } catch (err) {
            console.error("문항 로드 실패:", err);
        }
    };

    // 다음 단계 이동
    const fnNextStep = (finalData) => {
        if (timerRef.current) clearInterval(timerRef.current);
        stopAudio();

        if (itemNo + 1 < words.length) {
            fnQuest(itemNo + 1);
        } else {
            onComplete(finalData || quizResults);
        }
    };

    // --- [4] useEffect (함수 정의 이후 배치) ---
    useEffect(() => {
        if (words && words.length > 0) {
            const initialResults = words.map(w => ({ 
                ...w, 
                input_eng_pass: 'N', 
                input_kor_pass: 'N' 
            }));
            
            setQuizResults(initialResults);
            
            if (timerRef.current) clearInterval(timerRef.current);
            stopAudio(); // 상단에 정의되어 있어 이제 에러가 나지 않음
            
            const startTimeout = setTimeout(() => fnQuest(0), 500);
            return () => {
                clearTimeout(startTimeout);
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [words.length]);

    // [수정] 1. handleAudioEnd: 오디오가 끝나면 다음 단계로 이동하는 관문
    const handleAudioEnd = () => {
        setPlayState(false);
        
        // 정답이 체크된 상태(pass.eng && pass.kor)라면 다음 문제로 이동
        if (pass.eng && pass.kor && !isNextLoading) {
            console.log("🔊 음성 종료 -> 다음 문항으로 이동");
            setIsNextLoading(true); 
            setTimeout(() => fnNextStep(), 600); // 0.6초 뒤 이동
        }
    };

    // [보강] checkAnswer: 정답 시 타이머를 즉시 'null' 처리
    const checkAnswer = (type, val) => {
        if (playState || timeLeft === 0 || isNextLoading) return;
        const currentWord = getCurWord(itemNo);
        const isCorrect = type === 'eng' ? val === currentWord.study_eng : val === currentWord.study_kor;

        if (isCorrect) {
            // 정답을 맞추는 순간 타이머를 즉시 정지하고 참조를 비웁니다.
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null; 
            }

            const updatedResults = [...quizResults];
            if (type === 'eng') updatedResults[itemNo].input_eng_pass = 'Y';
            if (type === 'kor') updatedResults[itemNo].input_kor_pass = 'Y';
            setQuizResults(updatedResults);

            stopAudio();
            audioRef.current.src = "/static/study/suc.mp3";
            audioRef.current.play().catch(() => {});
            
            setPass(prev => {
                const newState = { ...prev, [type]: true };
                if (newState.eng && newState.kor) {
                    setTimeout(() => fnNextStep(updatedResults), 1000);
                }
                return newState;
            });
        } else {
            stopAudio();
            audioRef.current.src = "/static/study/fail.mp3";
            audioRef.current.play().catch(() => {});
        }
    };

    if (!getCurWord(itemNo)) return null;

    // --- [6] 렌더링 UI ---
    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">음성이 끝난 후 정답을 선택할 수 있습니다.</span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            <div className="conbox4">
                <div className="sp_btn">
                    <button 
                        type="button" 
                        onClick={() => !playState && fnMp3Play()}
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
            
            <audio 
                ref={audioRef} 
                onEnded={handleAudioEnd} 
                onError={() => setPlayState(false)} 
            />
        </div>
    );
};

export default VocaQuiz;