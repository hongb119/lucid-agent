import React, { useState, useEffect, useRef } from 'react';

const PhoneticsPractice = ({ items, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); 
    const [playCnt, setPlayCnt] = useState(0); 
    const [playState, setPlayState] = useState(false); 
    const [isBlocked, setIsBlocked] = useState(false); 
    const [showContent, setShowContent] = useState(false);
    const [currentText, setCurrentText] = useState('');

    const audioRef = useRef(null);

    // [1] 아이템 시작 (음가 단계)
    useEffect(() => {
        if (showContent && items && items.length > 0) {
            const item = items[itemNo];
            setCurrentText(item.study_eng); 
            
            setPlayCnt(1);
            setPlayState(true);
            setIsBlocked(true); 

            if (audioRef.current) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${item.study_mp3_file}`;
                audioRef.current.play();
            }
        }
    }, [showContent, itemNo]);

    // [2] 오디오 종료 처리
    const handleAudioEnd = () => {
        setPlayState(false);
        setPlayCnt(prev => prev + 1); 

        // 따라 말할 시간 1초 부여
        setTimeout(() => {
            setIsBlocked(false);
        }, 1000);
    };

    // [3] 클릭 시 화면 전환 로직
    const handleViewClick = () => {
        if (playState || isBlocked) return;

        const item = items[itemNo];

        if (playCnt === 2) {
            setPlayState(true);
            setIsBlocked(true);
            setPlayCnt(3); 
            setTimeout(() => {
                if (audioRef.current) audioRef.current.play();
            }, 700);
        } 
        else if (playCnt === 4) {
            setPlayState(true);
            setIsBlocked(true);
            setPlayCnt(5); 
            setCurrentText(item.study_word); 

            if (audioRef.current) {
                audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${item.study_word_mp3_file}`;
                audioRef.current.play();
            }
        } 
        else if (playCnt >= 6) {
            handleNextItem();
        }
    };

    // [4] 다음 문항 이동 (NEXT 버튼 및 학습 완료 시 호출)
    const handleNextItem = () => {
        // 재생 중인 소리가 있다면 정지
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        if (itemNo + 1 === items.length) {
            onComplete();
        } else {
            setPlayCnt(0);
            setPlayState(false);
            setIsBlocked(false);
            setItemNo(prev => prev + 1);
        }
    };

    // [5] 상단 가이드 문구 동적 생성
    const getGuideMessage = () => {
        if (playState) return "음성을 잘 듣고 큰 소리로 따라 읽어보세요.";
        if (isBlocked) return "잘했어요! 1초만 기다렸다가 다음을 클릭하세요.";
        
        if (playCnt === 2) return "한 번 더 듣고 따라 하려면 글자를 클릭하세요.";
        if (playCnt === 4) return "글자를 클릭해서 이 음가가 포함된 '단어'를 확인하세요.";
        if (playCnt >= 6) return "학습을 마쳤습니다. 글자를 클릭하면 다음 문제로 넘어갑니다.";
        
        return "영어 글자를 클릭해서 학습을 진행하세요.";
    };

    if (!showContent) {
        return (
            <div className="educontainer" style={{background: 'rgba(255,255,255,0.6)'}}>
                <div className="ready_w">
                    <p>준비가 되었으면 플레이 버튼을 클릭해서 학습을 시작하세요.</p>
                    <button type="button" onClick={() => setShowContent(true)}>
                        <img src="/static/study/images/ready_icon.png" alt="Start" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {/* 동적 가이드 문구 표시 영역 */}
                            {getGuideMessage()}
                        </span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{items.length}</span></div>
            </div>
            
            <div className="conbox2">
                <div className={`boxline wordc2 ${playCnt >= 5 ? 'word_eff2' : ''}`} 
                     onClick={handleViewClick} 
                     style={{ cursor: (playState || isBlocked) ? 'not-allowed' : 'pointer' }}>
                    <div className="boxtext">
                        {currentText}
                    </div>
                </div>
            </div>
            
            {/* 하단 버튼 영역: 1, 2, 3 버튼 옆에 NEXT 버튼 배치 */}
            <div className="btns_wrapper">
                <div className="btns">
                    <button type="button" className={`numbtn ${playCnt === 1 || playCnt === 2 ? 'on' : ''}`}>1</button>
                    <button type="button" className={`numbtn ${playCnt === 3 || playCnt === 4 ? 'on' : ''}`}>2</button>
                    <button type="button" className={`numbtn ${playCnt === 5 || playCnt >= 6 ? 'on' : ''}`}>3</button>
                </div>
                <button type="button" className="next_action_btn" onClick={handleNextItem}>
                    NEXT <span>▶</span>
                </button>
            </div>
            
            <audio ref={audioRef} onEnded={handleAudioEnd} />

            <style jsx>{`
                .word_eff2 { color: #ffdf00; text-shadow: 2px 2px 5px rgba(0,0,0,0.5); }
                .on { background-color: #ffdf00 !important; color: #000 !important; box-shadow: 0 0 10px #ffdf00; }
                
                .btns_wrapper { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 20px; 
                    margin-top: 30px; 
                }

                .next_action_btn {
                    height: 45px;
                    padding: 0 20px;
                    background: #4a90e2;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s;
                    box-shadow: 0 4px 0 #357abd;
                }
                .next_action_btn:hover { background: #357abd; transform: translateY(-1px); }
                .next_action_btn:active { transform: translateY(2px); box-shadow: none; }
                .next_action_btn span { font-size: 14px; }

                .tx_box { display: block; min-height: 40px; line-height: 1.4; }
            `}</style>
        </div>
    );
};

export default PhoneticsPractice;