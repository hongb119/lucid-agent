import React, { useState, useEffect, useRef } from 'react';

const DictaScramble = ({ words, onLog, onComplete }) => {
    const [itemNo, setItemNo] = useState(0);
    const [topSlots, setTopSlots] = useState([]);    
    const [bottomTiles, setBottomTiles] = useState([]); 
    const [nextStep, setNextStep] = useState("N"); // PHP의 next_step 변수 역할

    const [tryCount, setTryCount] = useState(1);
    const [itemStartTime, setItemStartTime] = useState(Date.now());

    const audioRef = useRef(null);
    const cur = words[itemNo];

    const initQuest = () => {
        if (!cur) return;
        setNextStep("N"); // 초기화

        const eng = cur.study_eng;
        const reg_ex = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
        const excWord = ["I", "'", " "];

        let tempTop = [];
        let tempBottomRaw = [];
        const blankLen = Math.round(eng.length * 0.3);
        let blankIndices = [];
        
        let attempts = 0;
        while (blankIndices.length < blankLen && attempts < 100) {
            let random = Math.floor(Math.random() * eng.length);
            if (!reg_ex.test(eng[random]) && !excWord.includes(eng[random]) && !blankIndices.includes(random)) {
                blankIndices.push(random);
            }
            attempts++;
        }

        for (let i = 0; i < eng.length; i++) {
            let char = eng[i];
            if (blankIndices.includes(i)) {
                tempTop.push({ type: 'blank', answer: char, current: '', key: null });
                tempBottomRaw.push({ char: char, originalIdx: i });
            } else {
                tempTop.push({ 
                    type: 'text', 
                    content: char === " " ? " " : char,
                    isSpace: char === " " 
                });
            }
        }

        setTopSlots(tempTop);
        setBottomTiles(tempBottomRaw.sort(() => Math.random() - 0.5).map((t, idx) => ({ ...t, id: idx, hidden: false })));
        setTryCount(1);
        setItemStartTime(Date.now());
        
        // 문제 진입 시 음성 재생 (PHP fnQuest 하단 로직)
        setTimeout(() => fnMp3Play(), 100);
    };

    useEffect(() => { initQuest(); }, [itemNo]);

    // 💡 PHP의 fnMp3Stop 로직을 그대로 구현
    const handleAudioEnded = () => {
        if (nextStep === "NEXT") {
            // 정답 효과음이 끝난 경우 -> 원본 음성 재재생
            setNextStep("END");
            fnMp3Play(); 
        } 
        else if (nextStep === "FAIL") {
            // 오답 효과음이 끝난 경우 -> 문제 리셋 (PHP: fnQuest 호출)
            initQuest();
        }
        else if (nextStep === "END") {
            // 원본 음성 재재생까지 끝난 경우 -> 자동으로 다음 문제
            if (itemNo + 1 < words.length) {
                setItemNo(prev => prev + 1);
            } else {
                onComplete();
            }
        }
    };

    // 💡 GO 버튼 클릭 (PHP의 fnStudySave)
    const handleGo = () => {
        if (nextStep !== "N") return; // 이미 판정 중이면 중복 클릭 방지

        const isAllFilled = topSlots.filter(s => s.type === 'blank').every(s => s.current !== "");
        if (!isAllFilled) {
            alert("옮겨지지 않은 단어가 있습니다.");
            return;
        }

        const fullAnswer = topSlots.map(s => s.type === 'text' ? s.content : s.answer).join("").trim().toLowerCase().replace(/\s/g, "");
        const userInput = topSlots.map(s => s.type === 'text' ? s.content : s.current).join("").trim().toLowerCase().replace(/\s/g, "");

        if (fullAnswer === userInput) {
            // 정답 처리
            onLog({
                study_item_no: cur.study_item_no,
                try_count: tryCount,
                taken_time: Math.floor((Date.now() - itemStartTime) / 1000),
                is_hint_used: 'N'
            });

            setNextStep("NEXT");
            if (audioRef.current) {
                audioRef.current.src = "/static/study/suc.mp3";
                audioRef.current.play();
            }
        } else {
            // 오답 처리
            setNextStep("FAIL");
            setTryCount(prev => prev + 1);
            if (audioRef.current) {
                audioRef.current.src = "/static/study/fail.mp3";
                audioRef.current.play();
            }
        }
    };

    const handleTileClick = (tile, bIdx) => {
        if (nextStep !== "N") return;
        const targetIdx = topSlots.findIndex(s => s.type === 'blank' && !s.current);
        if (targetIdx === -1) return;
        const newTop = [...topSlots];
        newTop[targetIdx].current = tile.char;
        newTop[targetIdx].key = tile.id;
        setTopSlots(newTop);
        const newBottom = [...bottomTiles];
        newBottom[bIdx].hidden = true;
        setBottomTiles(newBottom);
    };

    const handleCancel = (sIdx) => {
        if (nextStep !== "N") return;
        const slot = topSlots[sIdx];
        if (slot.type !== 'blank' || !slot.current) return;
        const newBottom = [...bottomTiles];
        const tileIdx = newBottom.findIndex(b => b.id === slot.key);
        if (tileIdx !== -1) newBottom[tileIdx].hidden = false;
        setBottomTiles(newBottom);
        const newTop = [...topSlots];
        newTop[sIdx].current = '';
        newTop[sIdx].key = null;
        
        let filled = newTop.filter(s => s.type === 'blank' && s.current !== "").map(s => ({ current: s.current, key: s.key }));
        let bCnt = 0;
        const finalTop = newTop.map(s => {
            if (s.type === 'blank') {
                const d = filled[bCnt];
                bCnt++;
                return { ...s, current: d ? d.current : '', key: d ? d.key : null };
            }
            return s;
        });
        setTopSlots(finalTop);
    };

    const fnMp3Play = () => {
        if (audioRef.current) {
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${cur.study_mp3_file}`;
            audioRef.current.play().catch(e => console.log("재생 오류:", e));
        }
    };

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx"><span className="tx_box">들려 주는 음성의 단어를 아래에서 찾아서 위쪽으로 옮기세요.</span></p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            <div className="conbox4">
                <div className="sp_btn"><button type="button" onClick={fnMp3Play}><img src="/static/study/images/btn01.png" alt="" /></button></div>
            </div>

            <div className="conbox9">
                <div className="cbox9">
                    <div className="textr">
                        <div className="line1" id="btn-top-list">
                            {topSlots.map((slot, i) => (
                                slot.type === 'text' ? (
                                    <p key={i} className="txbtn4" style={{ margin: slot.isSpace ? '0 10px' : '0 2px' }}>
                                        {slot.content}
                                    </p>
                                ) : (
                                    <p key={i} className="txbtn3" onClick={() => handleCancel(i)} style={{ cursor: 'pointer' }}>
                                        {slot.current}
                                    </p>
                                )
                            ))}
                            {/* GO 버튼은 판정 중(nextStep !== 'N')일 때 클릭 방지 */}
                            <button type="button" className="go_btn" onClick={handleGo} disabled={nextStep !== "N"}>GO</button>
                        </div>
                        <div className="line2" id="btn-clk-list" style={{ marginTop: '25px' }}>
                            {bottomTiles.map((tile, i) => (
                                <p key={tile.id} className="txbtn2" 
                                   style={{ display: tile.hidden ? 'none' : 'inline-block', cursor: 'pointer' }}
                                   onClick={() => handleTileClick(tile, i)}>
                                    {tile.char}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <audio ref={audioRef} onEnded={handleAudioEnded} />
        </div>
    );
};

export default DictaScramble;