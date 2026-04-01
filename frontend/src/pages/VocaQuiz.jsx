import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const VocaQuiz = ({ words, taskId, reStudy, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); 
    const [engList, setEngList] = useState([]); 
    const [korList, setKorList] = useState([]); 
    const [timeLeft, setTimeLeft] = useState(15);
    const [playState, setPlayState] = useState(true); 
    const [pass, setPass] = useState({ eng: false, kor: false });
    const [quizResults, setQuizResults] = useState([]);
    const [isNextLoading, setIsNextLoading] = useState(false); // 중복 방지 플래그

    const audioRef = useRef(null);
    const timerRef = useRef(null);

    const getCurWord = (idx) => (words && words[idx]) ? words[idx] : null;

    useEffect(() => {
        if (words && words.length > 0 && quizResults.length === 0) {
            setQuizResults(words.map(w => ({ ...w, input_eng_pass: 'N', input_kor_pass: 'N' })));
            setTimeout(() => fnQuest(0), 100);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopAudio(); // 컴포넌트 언마운트 시 오디오 중단
        };
    }, [words.length]);

    // 오디오 중단 및 초기화 공통 함수
    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = ""; // 소스 초기화로 잔향 제거
        }
    };

    const fnQuest = async (no) => {
        const targetWord = getCurWord(no);
        if (!targetWord) return;

        try {
            if (timerRef.current) clearInterval(timerRef.current);
            
            setIsNextLoading(false); 
            setPlayState(true);
            setPass({ eng: false, kor: false });
            setTimeLeft(15);

            const res = await axios.post(`/api/voca/studyPVocaStepRandom`, {
                study_eng: targetWord.study_eng
            });

            if (res.data.result_code === "200") {
                let combined = [...res.data.studyVocaRandomList, targetWord];
                const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
                
                setEngList(shuffle(combined));
                setKorList(shuffle(combined));
                setItemNo(no);
                
                // 데이터 세팅 후 이전 음성이 남아있지 않도록 확실히 처리
                stopAudio();

                setTimeout(() => {
                    fnMp3Play(targetWord);
                    fnTimer();
                }, 300); // 렌더링 안정화를 위해 지연시간 약간 늘림
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
        // 타임아웃 시에도 음성을 다시 들려줄 때 겹치지 않게 stop 후 재생
        stopAudio();
        fnMp3Play();
        // 타임아웃 정답 노출 후 다음 문제는 음성이 끝난 뒤 진행되도록 handleAudioEnd에서 처리됨
    };

    const fnMp3Play = (wordObj) => {
        const target = wordObj || getCurWord(itemNo);
        if (!audioRef.current || !target?.study_mp3_file) return;

        try {
            stopAudio(); // 재생 전 무조건 정지

            setPlayState(true);
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${target.study_mp3_file}`;
            
            // 재생 로직 (브라우저 정책 대응)
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("재생 인터랙션 대기:", e.message);
                    setPlayState(false);
                });
            }
        } catch (error) {
            console.error("음성 재생 오류:", error);
            setPlayState(false);
        }
    };

    const handleAudioEnd = () => {
        setPlayState(false);
        // 정답을 다 맞힌 상태이거나 타임아웃이 된 상태에서 음성이 끝났을 때만 다음으로 진행
        if (pass.eng && pass.kor && !isNextLoading) {
            setIsNextLoading(true); // 중복 이동 방지
            setTimeout(() => fnNextStep(), 500);
        }
    };

    const checkAnswer = (type, val) => {
        // 음성 재생 중이거나 이미 다음 문제로 넘어가는 중이면 클릭 방지
        if (playState || timeLeft === 0 || isNextLoading) return;

        const currentWord = getCurWord(itemNo);
        const isCorrect = type === 'eng' ? val === currentWord.study_eng : val === currentWord.study_kor;

        if (isCorrect) {
            const updatedResults = [...quizResults];
            if (type === 'eng') updatedResults[itemNo].input_eng_pass = 'Y';
            if (type === 'kor') updatedResults[itemNo].input_kor_pass = 'Y';
            setQuizResults(updatedResults);

            // 정답 효과음 재생 전 기존 중지
            stopAudio();
            audioRef.current.src = "/static/study/suc.mp3";
            audioRef.current.play().catch(() => {});
            
            setPass(prev => {
                const newState = { ...prev, [type]: true };
                // 영/한 모두 맞췄을 때
                if (newState.eng && newState.kor) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    // 효과음이 들릴 시간을 주고 다음 단계 판단
                    // 여기서는 효과음이 짧으므로 1초 뒤에 이동하거나, 
                    // 필요 시 효과음 끝난 후 이동하도록 수정 가능
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

    const fnNextStep = (finalData) => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        // 이동 전 오디오 완전 종료
        stopAudio();

        if (itemNo + 1 < words.length) {
            fnQuest(itemNo + 1);
        } else {
            onComplete(finalData || quizResults);
        }
    };

    if (!getCurWord(itemNo)) return null;

    return (
        <div id="agent-content" className="educontainer">
            {/* 상단 레이아웃은 동일 */}
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
            {/* 오디오 태그 제어 */}
            <audio 
                ref={audioRef} 
                onEnded={handleAudioEnd} 
                onError={() => setPlayState(false)} 
            />
        </div>
    );
};

export default VocaQuiz;