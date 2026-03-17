import React, { useState, useEffect, useRef } from 'react';

const RSentenceQuiz = ({ items, onLog, onComplete }) => {
    const [itemNo, setItemNo] = useState(0);
    const [topList, setTopList] = useState([]); 
    const [bottomList, setBottomList] = useState([]); 
    const [nextBlankNo, setNextBlankNo] = useState(0);
    const [totalBlankNo, setTotalBlankNo] = useState(0);
    const [timer, setTimer] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const cur = items[itemNo];
    const timerRef = useRef(null);
    const audioRef = useRef(new Audio());

    // PHP 소스와 동일한 설정
    const excWord = ["I", "'", "\""];
    const reg_ex = /[`~!@#$%^&*()_|+\-=?;:'"’,.<>{}[\]\\\/ ]/;

    useEffect(() => {
        if (cur) {
            initQuiz();
            startTimer();
            playStudyMp3(cur.study_mp3_file);
        }
        return () => clearInterval(timerRef.current);
    }, [itemNo, cur]);

    const playStudyMp3 = (fileName) => {
        audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${fileName}`;
        audioRef.current.play().catch(e => console.log("Audio play blocked"));
    };

    const initQuiz = () => {
        // PHP: var patternExt = itemArray[item_no].study_eng.trim().split(" ");
        const patternExt = cur.study_eng.trim().split(" ");
        let arrQuiz = [];
        let arrQuizNo = [];
        let arrQuizWord = [];

        // 1. 퀴즈 대상 단어 추출 (PHP excWord 로직)
        patternExt.forEach(word => {
            let excFlag = excWord.some(ex => word.includes(ex));
            if (!excFlag) arrQuiz.push(word.trim());
        });

        // 2. 빈칸 단어 인덱스 선정 (30%)
        let blankLen = Math.round(patternExt.length * 0.3);
        if (blankLen < 1) blankLen = 1;
        while (arrQuizNo.length < blankLen) {
            let random = Math.floor(Math.random() * patternExt.length);
            if (arrQuizNo.indexOf(random) === -1) arrQuizNo.push(random);
        }

        // 3. 상단(Top) 리스트 구성 - 글자 단위 쪼개기
        let newTop = [];
        let tempTotalBlank = 0;

        patternExt.forEach((val, key) => {
            let isBlankTarget = false;
            for (let i = 0; i < arrQuizNo.length; i++) {
                if (patternExt[arrQuizNo[i]] === val) {
                    isBlankTarget = true;
                    break;
                }
            }

            if (isBlankTarget) {
                // PHP: for(var c = 0; c<tmp.length; c++) { ... substring(c, (c+1)) }
                for (let c = 0; c < val.length; c++) {
                    let char = val.substring(c, c + 1);
                    if (reg_ex.test(char)) {
                        newTop.push({ type: 'text', val: char });
                    } else {
                        newTop.push({ 
                            type: 'blank', 
                            id: tempTotalBlank, 
                            val: '', 
                            answer: char, 
                            key: null 
                        });
                        arrQuizWord.push(char); // 하단 보기에 글자 추가
                        tempTotalBlank++;
                    }
                }
            } else {
                newTop.push({ type: 'text', val: val });
            }
            newTop.push({ type: 'space' });
        });

        setTopList(newTop);
        setTotalBlankNo(tempTotalBlank);
        setNextBlankNo(0);

        // 4. 하단(Bottom) 보기 셔플
        setBottomList(arrQuizWord.sort(() => Math.random() - 0.5));
        setIsProcessing(false);
    };

    // 하단 글자 클릭 (fnPatterBtnTop 역할)
    const handleWordClick = (char, bottomIdx) => {
        if (isProcessing || nextBlankNo >= totalBlankNo || !char) return;

        const updatedTop = [...topList];
        const targetIdx = updatedTop.findIndex(t => t.type === 'blank' && t.id === nextBlankNo);
        
        if (targetIdx !== -1) {
            updatedTop[targetIdx].val = char;
            updatedTop[targetIdx].key = bottomIdx;
            setTopList(updatedTop);
            
            const updatedBottom = [...bottomList];
            updatedBottom[bottomIdx] = null; // 사용한 글자 숨김
            setBottomList(updatedBottom);
            setNextBlankNo(prev => prev + 1);
        }
    };

    // 상단 글자 클릭 취소 (fnPatterClear 역할)
    const handleClear = (id) => {
        if (isProcessing) return;
        const targetIdx = topList.findIndex(t => t.type === 'blank' && t.id === id);
        if (targetIdx === -1 || !topList[targetIdx].val) return;

        const item = topList[targetIdx];
        const updatedBottom = [...bottomList];
        updatedBottom[item.key] = item.val; // 하단에 글자 복구
        setBottomList(updatedBottom);

        const updatedTop = [...topList];
        updatedTop[targetIdx].val = '';
        updatedTop[targetIdx].key = null;
        setTopList(updatedTop);
        
        // 지운 칸 이후로 다시 채우도록 순서 조정
        if (id < nextBlankNo) setNextBlankNo(id);
    };

    const startTimer = () => {
        setTimer(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    };

    const handleCheck = () => {
        if (isProcessing) return;
        if (topList.some(t => t.type === 'blank' && !t.val)) {
            alert("옮겨지지 않은 단어가 있습니다.");
            return;
        }

        setIsProcessing(true);
        clearInterval(timerRef.current);

        // PHP의 clk_pattern 조립 로직 재현
        let clk_pattern = "";
        topList.forEach(t => {
            if (t.type === 'space') clk_pattern += " ";
            else if (t.type === 'text' || t.type === 'blank') clk_pattern += t.val;
        });

        const isCorrect = cur.study_eng.trim().toLowerCase() === clk_pattern.trim().toLowerCase();
        new Audio(isCorrect ? "/static/study/suc.mp3" : "/static/study/fail.mp3").play();

        // 메인으로 로그 전달
        onLog({
            study_item_no: cur.study_item_no,
            try_count: isCorrect ? 1 : 2,
            taken_time: timer,
            input_text: clk_pattern.trim(),
            is_correct: isCorrect ? 'Y' : 'N',
            is_hint_used: 'N'
        });

        setTimeout(() => {
            if (itemNo + 1 < items.length) {
                setItemNo(prev => prev + 1);
            } else {
                onComplete(); 
            }
        }, 1500);
    };

    return (
        <div className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx"><span className="tx_box">들려 주는 음성의 단어를 아래에서 찾아서 위쪽으로 옮기세요.</span></p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{items.length}</span></div>
            </div>

            <div className="conbox4">
                <div className="sp_btn">
                    <button type="button" onClick={() => playStudyMp3(cur.study_mp3_file)}>
                        <img src="/static/study/images/btn01.png" alt="스피커" />
                    </button>
                </div>
            </div>

            <div className="conbox9">
                <div className="cbox9">
                    <div className="textr">
                        {/* 상단 문장 영역 (txbtn3, txbtn4) */}
                        <div className="line1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                            {topList.map((t, i) => {
                                if (t.type === 'space') return <span key={i}>&nbsp;</span>;
                                if (t.type === 'text') return <p key={i} className="txbtn4">{t.val}</p>;
                                return (
                                    <p key={i} className="txbtn3" style={{ cursor: 'pointer' }} onClick={() => handleClear(t.id)}>
                                        {t.val}
                                    </p>
                                );
                            })}
                            <button type="button" className="go_btn" onClick={handleCheck}>GO</button>
                        </div>

                        {/* 하단 글자 조각 영역 (txbtn2) */}
                        <div className="line2" style={{ marginTop: '30px' }}>
                            {bottomList.map((char, i) => (
                                char !== null && (
                                    <p key={i} className="txbtn2" style={{ cursor: 'pointer' }} onClick={() => handleWordClick(char, i)}>
                                        {char}
                                    </p>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RSentenceQuiz;