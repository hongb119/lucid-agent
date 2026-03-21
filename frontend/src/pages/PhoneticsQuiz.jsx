import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const PhoneticsQuiz = ({ items, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); // 현재 문제 번호 (1부터 시작)
    const [engList, setEngList] = useState([]);
    const [wordList, setWordList] = useState([]);
    const [firstPlayState, setFirstPlayState] = useState(false);
    const [quizResults, setQuizResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const audioRef = useRef(null);

    // 초기 결과 배열 생성
    useEffect(() => {
        if (items && items.length > 0) {
            const initial = items.map(item => ({
                ...item,
                input_eng_pass: 'N',
                input_word_pass: 'N'
            }));
            setQuizResults(initial);
        }
    }, [items]);

    const startQuiz = async (idx) => {
        if (idx >= items.length || loading) return;
        setLoading(true);

        const currentItem = items[idx];
        
        try {
            const res = await axios.post('/api/phonetics/random', {
                study_step1_code: currentItem.study_step1_code,
                study_step2_code: currentItem.study_step2_code,
                study_no: currentItem.study_no,
                study_eng: currentItem.study_eng,
                study_word: currentItem.study_word
            });

            if (res.data.result_code === '200') {
                // 음가 및 단어 섞기
                const engRandom = [...res.data.studyPhoneticsRandomList, currentItem].sort(() => Math.random() - 0.5);
                const wordRandom = [...res.data.studyPhoneticsRandomWordList, currentItem].sort(() => Math.random() - 0.5);

                setEngList(engRandom);
                setWordList(wordRandom);
                
                // [수정] 인덱스 관리를 위해 데이터 로드 완료 후 문항 번호 설정
                setItemNo(idx + 1);
                setFirstPlayState(true);

                if (audioRef.current) {
                    audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${currentItem.study_mp3_file}`;
                    audioRef.current.play();
                }
            }
        } catch (err) {
            console.error("데이터 로드 실패:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAudioEnd = () => {
        setFirstPlayState(false);
    };

    // 정답/오답 사운드 재생 함수 (PHP fnMp3Play 대체)
    const playEffect = (type) => {
        if (audioRef.current) {
            audioRef.current.src = type === 'suc' ? "/static/study/suc.mp3" : "/static/study/fail.mp3";
            audioRef.current.play();
        }
    };

    const checkAnswer = (type, value) => {
        if (firstPlayState || loading) return;

        const idx = itemNo - 1;
        const currentItem = items[idx];
        const updatedResults = [...quizResults];
        
        // 이미 둘 다 맞췄으면 클릭 무시
        if (updatedResults[idx].input_eng_pass === 'Y' && updatedResults[idx].input_word_pass === 'Y') return;

        const isCorrect = type === 'eng' ? currentItem.study_eng === value : currentItem.study_word === value;

        if (isCorrect) {
            playEffect('suc');
            if (type === 'eng') updatedResults[idx].input_eng_pass = 'Y';
            else updatedResults[idx].input_word_pass = 'Y';
            
            setQuizResults(updatedResults);

            // [핵심] PHP의 setTimeout("fnQuest()", 2000) 로직 구현
            if (updatedResults[idx].input_eng_pass === 'Y' && updatedResults[idx].input_word_pass === 'Y') {
                setTimeout(() => {
                    if (itemNo === items.length) {
                        onComplete(updatedResults);
                    } else {
                        startQuiz(itemNo); // 다음 문제로 (현재 itemNo가 다음 인덱스임)
                    }
                }, 2000);
            }
        } else {
            playEffect('fail');
        }
    };

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_tx">
                        <span className="tx_box">
                            들려주는 음가와 단어를 선택하세요. {itemNo === 0 && "(START를 눌러주세요)"}
                        </span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo}/{items.length}</span></div>
            </div>

            {itemNo === 0 ? (
                <div className="start_page" style={{textAlign:'center', marginTop:'50px'}}>
                    <button type="button" className="btn_start" onClick={() => startQuiz(0)}>START</button>
                </div>
            ) : (
                <>
                    <div className="conbox4">
                        <div className="sp_btn">
                            <button type="button" onClick={() => {
                                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${items[itemNo-1].study_mp3_file}`;
                                audioRef.current.play();
                            }}>
                                <img src="/static/study/images/btn01.png" alt="스피커" />
                            </button>
                        </div>
                    </div>

                    <div className="conbox5">
                        <div className="box5_1">
                            <ul>
                                <li className="tx">음가</li>
                                {engList.map((item, i) => (
                                    <li key={i} className={`btn ${quizResults[itemNo-1]?.input_eng_pass === 'Y' && quizResults[itemNo-1]?.study_eng === item.study_eng ? 'ok' : ''}`}>
                                        <button type="button" onClick={() => checkAnswer('eng', item.study_eng)}>
                                            {item.study_eng}
                                        </button>
                                        {quizResults[itemNo-1]?.input_eng_pass === 'Y' && quizResults[itemNo-1]?.study_eng === item.study_eng && (
                                            <span className="okicon"><img src="/static/study/images/icon03.png" alt="정답" /></span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="box5_1 tx_kor">
                            <ul>
                                <li className="tx">단어</li>
                                {wordList.map((item, i) => (
                                    <li key={i} className={`btn ${quizResults[itemNo-1]?.input_word_pass === 'Y' && quizResults[itemNo-1]?.study_word === item.study_word ? 'ok' : ''}`}>
                                        <button type="button" onClick={() => checkAnswer('word', item.study_word)}>
                                            {item.study_word}
                                        </button>
                                        {quizResults[itemNo-1]?.input_word_pass === 'Y' && quizResults[itemNo-1]?.study_word === item.study_word && (
                                            <span className="okicon"><img src="/static/study/images/icon03.png" alt="정답" /></span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            )}
            <audio ref={audioRef} onEnded={handleAudioEnd} />
        </div>
    );
};

export default PhoneticsQuiz;