import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PatternDrill_Unscramble = ({ contents, onComplete, isRetry = false }) => {
    const [itemNo, setItemNo] = useState(0);
    const [quizWords, setQuizWords] = useState([]); 
    const [inputWords, setInputWords] = useState([]); 
    const [feedback, setFeedback] = useState(null); 
    const [results, setResults] = useState([]); 

    const audioRef = useRef(new Audio());
    const currentItem = contents[itemNo];

    const dynamicBtnStyle = {
        width: 'auto',
        minWidth: '70px',
        padding: '0 20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        margin: '5px'
    };

    useEffect(() => {
        if (!currentItem) return;
        setFeedback(null);
        setInputWords([]);
        
        const text = currentItem.study_unscramble || currentItem.study_eng;
        const words = text.replace(/\[\[|\]\]/g, '').split(' ');
        const shuffled = shuffleArray(words);
        setQuizWords(shuffled);
        
        playAudio(currentItem.study_mp3_file);
    }, [itemNo, currentItem]); // currentItem 변경 시에도 초기화되도록 추가

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

    const handleWordClick = (word, idx) => {
        if (feedback) return;
        setInputWords([...inputWords, word]);
        setQuizWords(quizWords.filter((_, i) => i !== idx));
    };

    const handleCancelWord = (word, idx) => {
        if (feedback) return;
        setQuizWords([...quizWords, word]);
        setInputWords(inputWords.filter((_, i) => i !== idx));
    };

    // [중요] 결과 계산 전용 함수: 외부 변수(10개 등)를 절대 쓰지 않음
    const calculateAndComplete = (allLogs) => {
        // 1. 현재 이 컴포넌트가 받은 문항 리스트(contents)의 ID들만 추출
        const currentItemIds = contents.map(item => item.study_item_no);

        // 2. 로그 중에서 현재 받은 문항들에 해당하는 '마지막' 결과만 필터링
        const finalStatusMap = {};
        allLogs.forEach(log => {
            if (currentItemIds.includes(log.study_item_no)) {
                finalStatusMap[log.study_item_no] = log.is_unscramble_correct;
            }
        });

        // 3. 오직 현재 contents 길이를 기준으로만 정답/오답 산출
        const statusValues = Object.values(finalStatusMap);
        const correct = statusValues.filter(v => v === true).length;
        
        const finalStats = {
            correct: correct,
            wrong: contents.length - correct // (1 - 1 = 0 이 나옴)
        };

        onComplete(allLogs, finalStats);
    };

    const proceedToNext = (isCorrect) => {
        const currentLog = {
            study_item_no: currentItem.study_item_no,
            unscramble_input: inputWords.join(' '),
            is_unscramble_correct: isCorrect
        };
        
        const updatedResults = [...results, currentLog];
        setResults(updatedResults);

        if (itemNo + 1 < contents.length) {
            setItemNo(prev => prev + 1);
        } else {
            // 마지막 문제일 때 계산 함수 호출
            calculateAndComplete(updatedResults);
        }
    };

    const handleUnscrambleSubmit = async () => {
        const inputStr = inputWords.join(' ');
        let isCorrect = false;
        
        try {
            const formData = new FormData();
            formData.append('study_item_no', currentItem.study_item_no);
            formData.append('input_text', inputStr);
            const response = await axios.post('/api/patterndrill/check-unscramble', formData);
            isCorrect = response.data.is_correct;
        } catch (error) {
            const targetStr = currentItem.study_eng;
            isCorrect = inputStr.toLowerCase().replace(/[.?!]/g, '') === targetStr.toLowerCase().replace(/[.?!]/g, '');
        }

        setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
        playAudio(currentItem.study_mp3_file);

        // [방지 처리] 음성이 완전히 끝난 후 이벤트 발생
        audioRef.current.onended = () => {
            audioRef.current.onended = null;
            setTimeout(() => proceedToNext(isCorrect), 500);
        };
        
        // 음성 파일 문제 대비용 안전 타이머
        setTimeout(() => {
            if (audioRef.current.onended) {
                audioRef.current.onended = null;
                proceedToNext(isCorrect);
            }
        }, 4000);
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

            <div className={`conbox9 ${feedback}`}>
                <div className="cbox9">
                    <div className="textr">
                        <div className="line1" style={{ minHeight: '100px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
                            {inputWords.map((word, i) => (
                                <span key={`in-${i}`} className="txbtn2 on" onClick={() => handleCancelWord(word, i)} style={dynamicBtnStyle}>
                                    {word}
                                </span>
                            ))}
                            {quizWords.length === 0 && !feedback && (
                                <button type="button" className="go_btn" onClick={handleUnscrambleSubmit}>GO</button>
                            )}
                        </div>
                        
                        <div className="line2" style={{ minHeight: '120px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: '20px', borderTop: '1px solid #f0f0f0' }}>
                            {quizWords.map((word, i) => (
                                <button key={`q-${i}`} type="button" className="txbtn2" onClick={() => handleWordClick(word, i)} style={dynamicBtnStyle}>
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