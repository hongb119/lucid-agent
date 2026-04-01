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
        
        // 문제 진입 시 자동 재생
        playAudio(currentItem.study_mp3_file);
    }, [itemNo, currentItem]);

    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    // [로직 수정] 음성 재생 함수
    const playAudio = (file) => {
        const targetFile = file || currentItem?.study_mp3_file;
        if (!targetFile) return;

        // 현재 재생 중인 소리가 있다면 중지하고 처음부터 재생
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${targetFile}`;
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

    // [수정] 결과 계산 및 최종 완료 처리
   // [수정] 결과 계산 및 최종 완료 처리
    const calculateAndComplete = (allLogs) => {
        // is_unscramble_correct가 true인 것만 필터링
        const correctCount = allLogs.filter(log => log.is_unscramble_correct === true).length;
        const totalCount = contents.length;
        const failCount = totalCount - correctCount;

        console.log(`[최종통계] 전체:${totalCount}, 정답:${correctCount}, 오답:${failCount}`);

        const reportData = {
            fail_count: failCount,
            pass_count: correctCount,
            total_count: totalCount,
            user_name: "", 
            summary: failCount === 0 ? "완벽합니다!" : "오답을 확인하고 다시 도전해보세요."
        };

        // 부모에게 데이터 전달
        onComplete(reportData, allLogs);
    };

    // [수정] 다음 문제 진행 로직 (상세 정보 보강)
    const proceedToNext = (isCorrect) => {
        // [디버깅] 현재 선택된 단어 배열이 무엇인지 콘솔에 출력
        const finalInputString = inputWords.join(' ').trim();
        
        const currentLog = {
            study_item_no: currentItem.study_item_no,
            question_text: currentItem.study_eng, 
            unscramble_input: finalInputString, // 여기서 문자열을 확정해서 넘김
            is_unscramble_correct: isCorrect,
            study_mp3_file: currentItem.study_mp3_file 
        };
        
        const updatedResults = [...results, currentLog];
        setResults(updatedResults);

        if (itemNo + 1 < contents.length) {
            setItemNo(prev => prev + 1);
        } else {
            // 마지막 문제라면 리포트 데이터 생성 후 완료
            calculateAndComplete(updatedResults);
        }
    };

   const handleUnscrambleSubmit = () => {
        // 1. 내가 선택한 문장 조립 (양끝 공백 제거 및 연속 공백 한 칸으로 통일)
        const myAnswer = inputWords.join(' ').trim().replace(/\s+/g, ' ');
        
        // 2. 실제 정답 문장 가져오기
        const correctAnswer = currentItem.study_eng || "";

        // 3. 비교를 위한 정규화 (소문자 변환 및 마침표/콤마 등 구두점 제거)
        const normalize = (text) => {
            return text
                .toLowerCase()
                .replace(/[.?!,]/g, '') // 구두점 제거
                .replace(/\s+/g, ' ')   // 연속된 공백 하나로
                .trim();                // 앞뒤 공백 제거
        };

        const cleanMyAnswer = normalize(myAnswer);
        const cleanCorrectAnswer = normalize(correctAnswer);

        
        
        // 4. 최종 판정 (토씨 하나 안 틀리고 똑같아야 함)
        const isCorrect = (cleanMyAnswer === cleanCorrectAnswer);
        
        

        // 5. 상태 반영 및 피드백
        setFeedback(isCorrect ? 'CORRECT' : 'WRONG');
        
        // 정답/오답 소리 재생 (원어민 음성)
        playAudio(currentItem.study_mp3_file);

        // 6. 음성 종료 후 다음 문제로 (판정 결과를 직접 전달)
        audioRef.current.onended = () => {
            audioRef.current.onended = null;
            setTimeout(() => proceedToNext(isCorrect), 500);
        };
        
        // 안전 타이머 (음성 재생 실패 대비)
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

            {/* [추가] 음성 듣기 버튼 영역 */}
            <div className="conbox4" style={{ marginBottom: '20px' }}>
                <div className="sp_btn">
                    <button type="button" onClick={() => playAudio()}>
                        <img src="/static/study/images/btn01.png" alt="음성듣기" style={{ cursor: 'pointer' }} />
                    </button>
                </div>
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