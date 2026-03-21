import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatternDrill_Unscramble = ({ contents, onComplete }) => {
    const [itemNo, setItemNo] = useState(0);
    const [quizWords, setQuizWords] = useState([]); 
    const [inputWords, setInputWords] = useState([]); 
    const [feedback, setFeedback] = useState(null); // CORRECT, WRONG
    const [stats, setStats] = useState({ correct: 0, wrong: 0 });
    const [results, setResults] = useState([]);

    const audioRef = useRef(new Audio());
    const currentItem = contents[itemNo];

    // [로직 1] 문제 초기화 및 음성 재생 (기존 initUnscramble 이식)
    useEffect(() => {
        if (!currentItem) return;
        
        setFeedback(null);
        setInputWords([]);
        
        // [[ ]] 파싱 및 완전한 무작위 섞기 (Fisher-Yates 알고리즘)
        const text = currentItem.study_unscramble || currentItem.study_eng;
        const words = text.replace(/\[\[|\]\]/g, '').split(' ');
        const shuffled = shuffleArray(words);
        setQuizWords(shuffled);

        // 문장 시작 시 음성 들려주기
        playAudio(currentItem.study_mp3_file);
    }, [itemNo]);

    // Fisher-Yates 알고리즘으로 완전한 무작위 섞기
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const playAudio = (file) => {
        if (!file) return;
        audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${file}`;
        audioRef.current.play().catch(e => console.log("Audio play deferred"));
    };

    // [기능] 단어 선택 (하단 -> 상단)
    const handleWordClick = (word, idx) => {
        if (feedback) return;
        setInputWords([...inputWords, word]);
        setQuizWords(quizWords.filter((_, i) => i !== idx));
    };

    // [기능] 단어 취소 (상단 -> 하단)
    const handleCancelWord = (word, idx) => {
        if (feedback) return;
        setQuizWords([...quizWords, word]);
        setInputWords(inputWords.filter((_, i) => i !== idx));
    };

    // [로직 2] 정답 체크 및 피드백 (백엔드 API 사용)
    const handleUnscrambleSubmit = async () => {
        const inputStr = inputWords.join(' ');
        
        try {
            // 백엔드 API로 정답 검증
            const formData = new FormData();
            formData.append('study_item_no', currentItem.study_item_no);
            formData.append('input_text', inputStr);
            
            const response = await axios.post('/api/patterndrill/check-unscramble', formData);
            const isCorrect = response.data.is_correct;
            
            setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
            
            // 정답일 때 음성 다시 들려주기
            if (isCorrect) {
                playAudio(currentItem.study_mp3_file);
            } else {
                // 오답일 때는 정답 음성 들려주기 (학습 효과 증대)
                setTimeout(() => {
                    playAudio(currentItem.study_mp3_file);
                }, 800);
            }

            // 성적 누적
            const newStats = {
                correct: isCorrect ? stats.correct + 1 : stats.correct,
                wrong: !isCorrect ? stats.wrong + 1 : stats.wrong
            };
            setStats(newStats);

            // 결과 로그 저장
            const currentLog = {
                study_item_no: currentItem.study_item_no,
                unscramble_input: inputStr,
                is_unscramble_correct: isCorrect
            };

            // [로직 3] 잠시 대기 후 다음 문장으로 (사용자가 정답을 확인할 시간 부여)
            setTimeout(() => {
                const updatedResults = [...results, currentLog];
                setResults(updatedResults);

                if (itemNo + 1 < contents.length) {
                    setItemNo(prev => prev + 1);
                } else {
                    // 최종 완료 시 부모에게 전체 로그와 성적 전달
                    onComplete(updatedResults, newStats);
                }
            }, 2000); // 2초 대기 (오답 시 피드백 시간 확보)
        } catch (error) {
            console.error('언스크램블 검증 실패:', error);
            // API 실패 시 기존 방식으로 fallback
            const targetStr = currentItem.study_eng;
            const isCorrect = inputStr.toLowerCase().replace(/[.?!]/g, '') === targetStr.toLowerCase().replace(/[.?!]/g, '');
            
            setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
            
            if (isCorrect) {
                playAudio(currentItem.study_mp3_file);
            }

            const newStats = {
                correct: isCorrect ? stats.correct + 1 : stats.correct,
                wrong: !isCorrect ? stats.wrong + 1 : stats.wrong
            };
            setStats(newStats);

            const currentLog = {
                study_item_no: currentItem.study_item_no,
                unscramble_input: inputStr,
                is_unscramble_correct: isCorrect
            };

            setTimeout(() => {
                const updatedResults = [...results, currentLog];
                setResults(updatedResults);

                if (itemNo + 1 < contents.length) {
                    setItemNo(prev => prev + 1);
                } else {
                    onComplete(updatedResults, newStats);
                }
            }, 2000);
        }
    };

    if (!currentItem) return null;

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">단어를 터치해서 문장을 완성해 보세요!</span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
            </div>

            {/* feedback 상태에 따라 CORRECT/WRONG 클래스 부여 (디자인 연동) */}
            <div className={`conbox9 ${feedback}`}>
                <div className="cbox9">
                    <div className="textr">
                        {/* 상단 입력 영역 (line1) */}
                        <div className="line1" style={{ minHeight: '90px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {inputWords.map((word, i) => (
                                <span key={i} className="txbtn2 on" onClick={() => handleCancelWord(word, i)}>
                                    {word}
                                </span>
                            ))}
                            {/* 모든 단어를 선택했을 때만 GO 버튼 노출 */}
                            {quizWords.length === 0 && !feedback && (
                                <button type="button" className="go_btn" onClick={handleUnscrambleSubmit}>GO</button>
                            )}
                        </div>
                        
                        {/* 하단 선택 영역 (line2) */}
                        <div className="line2" style={{ padding: '25px', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                            {quizWords.map((word, i) => (
                                <button key={i} type="button" className="txbtn2" onClick={() => handleWordClick(word, i)}>
                                    {word}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatternDrill_Unscramble;