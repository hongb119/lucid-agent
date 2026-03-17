import React, { useState, useEffect, useRef } from 'react';

const DictaQuiz = ({ words, onLog, onComplete }) => {
    const [itemNo, setItemNo] = useState(0);
    const [quizItems, setQuizItems] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [results, setResults] = useState([]); 
    
    // 💡 추가된 상태들
    const [timer, setTimer] = useState(0); // 문항별 소요 시간
    const [canNext, setCanNext] = useState(false); // 다음 버튼 활성화 여부
    
    const cur = words && words[itemNo] ? words[itemNo] : null;
    const audioRef = useRef(new Audio());
    const timerRef = useRef(null);

    // 1. 문항 변경 시 타이머 및 상태 초기화
    useEffect(() => {
        if (cur && cur.study_distractor) {
            setCanNext(false);
            setIsAnswered(false);
            setSelectedId(null);
            setTimer(0);
            setQuizItems(cur.study_distractor.split("/"));

            // 문항 시작 시 MP3 자동 재생 (Dictation의 연속성)
            if (cur.study_mp3_file) {
                audioRef.current.src = `/static/study/mp3/${cur.study_mp3_file}`;
                audioRef.current.play().catch(e => console.log("Auto-play blocked"));
            }

            // 타이머 시작
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [itemNo, cur]);

    // 2. 정답 체크 및 처리 로직
    const handleAnswer = (id) => {
        if (isAnswered) return; // 이미 풀었으면 클릭 방지

        clearInterval(timerRef.current); // 시간 멈춤
        setIsAnswered(true);
        setSelectedId(id);

        const isCorrect = parseInt(cur.study_answer) === id;
        
        // 결과 데이터 축적
        const currentData = {
            study_no: cur.study_no,
            study_item_no: cur.study_item_no,
            input_eng: String(id),
            input_eng_pass: isCorrect ? 'Y' : 'N'
        };
        const updatedResults = [...results, currentData];
        setResults(updatedResults);

        // 상위 컴포넌트로 로그 전송 (시도 횟수 및 실제 소요 시간 포함)
        onLog({
            study_item_no: cur.study_item_no,
            try_count: isCorrect ? 1 : 2,
            taken_time: timer,
            is_hint_used: 'N'
        });

        // 효과음 재생
        const effectAudio = new Audio(isCorrect ? "/static/study/suc.mp3" : "/static/study/fail.mp3");
        effectAudio.play();

        // 💡 2초 후 다음 문제로 자동 이동 (사용자 편의)
        setTimeout(() => {
            handleNext(updatedResults);
        }, 2000);
    };

    const handleNext = (currentResults = results) => {
        if (itemNo + 1 < words.length) {
            setItemNo(prev => prev + 1);
        } else {
            onComplete(currentResults);
        }
    };

    const renderQuestion = () => {
        if (!cur || !cur.study_question) return <p>데이터 로딩 중...</p>;
        
        // ______를 정답 단어로 교체하거나 빈칸으로 유지 (isAnswered 상태에 따라)
        const blank = cur.study_question.split(" ");
        let questionHtml = [];

        blank.forEach((word, i) => {
            if (i > 0) questionHtml.push(" ");
            if (word.includes("______")) {
                const suffix = word.replace(/_/g, "");
                // 정답을 맞췄거나 틀렸을 때 정답 단어를 빈칸에 보여줌
                const answerText = isAnswered ? quizItems[parseInt(cur.study_answer) - 1] : "";
                questionHtml.push(
                    <span key={i} className={`blankbox ${isAnswered ? 'show_ans' : ''}`}>
                        {answerText}
                    </span>
                );
                if (suffix) questionHtml.push(suffix);
            } else {
                questionHtml.push(word);
            }
        });
        return <p>{questionHtml}</p>;
    };

    if (!cur) return null;

    return (
        <div className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="" 
                             style={{ cursor: 'pointer' }}
                             onClick={() => audioRef.current.play()} // 아이콘 클릭 시 재재생
                        />
                    </p>
                    <p className="bubble_tx"><span className="tx_box">빈칸에 들어갈 알맞은 말을 골라보세요.</span></p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            <div className="conbox6 mt30">
                <div className="con6_qbox">
                    {renderQuestion()}
                </div>
                
                <div className="conb6_r wid100">
                    <ul>
                        {quizItems.map((dist, idx) => {
                            const id = idx + 1;
                            const isCorrectAnswer = parseInt(cur.study_answer) === id;
                            const isSelected = selectedId === id;
                            
                            // 클래스 제어: 정답이면 'ok', 내가 고른 게 틀렸으면 'fail'
                            let liClass = "";
                            if (isAnswered) {
                                if (isCorrectAnswer) liClass = "ok";
                                else if (isSelected) liClass = "fail";
                            }

                            return (
                                <li key={idx} className={liClass} onClick={() => handleAnswer(id)}>
                                    <button type="button">
                                        <span>{String.fromCharCode(65 + idx)}</span> {dist}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
            
            {/* 오답일 때만 수동으로 다음으로 넘어가게 할 경우 버튼 노출 (선택사항) */}
            {isAnswered && (
                <div className="btn_wrap mt20" style={{ textAlign: 'right' }}>
                    <button className="next_btn" onClick={() => handleNext()}>Next →</button>
                </div>
            )}
        </div>
    );
};

export default DictaQuiz;