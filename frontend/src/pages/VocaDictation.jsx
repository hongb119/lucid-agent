import React, { useState, useEffect, useRef } from 'react';

const VocaDictation = ({ words, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); 
    const [playCnt, setPlayCnt] = useState(1); 
    const [playState, setPlayState] = useState(true); 
    
    const audioRef = useRef(new Audio());
    const cur = words[itemNo];

    // [초기화] 단어 변경 시 로직
    useEffect(() => {
        if (cur) {
            setPlayCnt(1);
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${cur.study_mp3_file}`;
            fnMp3Play();
        }
    }, [itemNo]);

    const fnMp3Play = () => {
        setPlayState(true);
        audioRef.current.play().catch(() => setPlayState(false));
    };

    // 음성 종료 감지
    useEffect(() => {
        const audio = audioRef.current;
        const fnMp3Stop = () => {
            setPlayState(false); 
        };
        audio.addEventListener('ended', fnMp3Stop);
        return () => audio.removeEventListener('ended', fnMp3Stop);
    }, []);

    // 이미지/카드 클릭 시 단계 전환
    const handleViewClick = () => {
        if (playState) return; 

        if (playCnt === 1) {
            setPlayCnt(2);
            setTimeout(() => fnMp3Play(), 700);
        } 
        else if (playCnt === 2) {
            setPlayCnt(3);
            fnMp3Play();
        } 
        else if (playCnt === 3) {
            // 3단계 이후 클릭 시에도 다음 단계로
            handleNextStep();
        }
    };

    // 다음 단계(단어) 이동 함수
    const handleNextStep = () => {
        // 음성 재생 중일 때 넘어가면 이전 음성을 정지시킴
        audioRef.current.pause();
        audioRef.current.currentTime = 0;

        if (itemNo + 1 === words.length) {
            onComplete(); 
        } else {
            setPlayCnt(1);
            setItemNo(prev => prev + 1);
        }
    };

    if (!cur) return null;

    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1">
                <div className="speech">
                    <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            이미지를 클릭하면서 들려주는 음성을 큰 소리로 따라 말해보세요. <br />
                            총 3번을 반복해야 해요.
                        </span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            {/* 카드/이미지 영역 */}
            <div className="conbox2" 
                 onClick={handleViewClick} 
                 style={{ cursor: playState ? 'not-allowed' : 'pointer', minHeight: '350px' }}>
                
                {cur.study_img_file === "N" ? (
                    <div className={`boxline wordc2 ${playCnt >= 2 ? 'word_eff2' : ''}`}>
                        <div className="boxtext">
                            {playCnt >= 3 ? cur.study_kor : cur.study_eng}
                        </div>
                    </div>
                ) : (
                    <div className="boxline imgnoline">
                        <div className="boxtext">
                            <div className={`boximgw ${playCnt >= 2 ? 'ckevent' : ''}`}>
                                <img 
                                    key={`img-${itemNo}`}
                                    src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${cur.study_img_file}`} 
                                    className="imgfun"
                                    alt="" 
                                    style={{ opacity: 1, display: 'block' }} 
                                />
                                <p className="imgtext_en" style={{ display: playCnt === 2 ? 'block' : 'none' }}>
                                    <span>{cur.study_eng}</span>
                                </p>
                                <p className="imgtext_ko" style={{ display: playCnt === 3 ? 'block' : 'none' }}>
                                    <span>{cur.study_kor}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 하단 숫자 버튼 */}
            <div className="btns">
                <button type="button" className={`numbtn ${playCnt === 1 ? 'on' : ''}`}>1</button>
                <button type="button" className={`numbtn ${playCnt === 2 ? 'on' : ''}`}>2</button>
                <button type="button" className={`numbtn ${playCnt === 3 ? 'on' : ''}`}>3</button>
            </div>
            
            {/* NEXT 버튼 영역: 조건 없이 항상 활성화 */}
            <div className="btns m_txcenter" style={{ marginTop: '30px', textAlign: 'center' }}>
                <button 
                    type="button" 
                    onClick={handleNextStep}
                    style={{
                        width: '240px',
                        padding: '15px 0',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        backgroundColor: '#28a745', // 항상 초록색
                        color: '#fff',
                        borderRadius: '50px',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(40,167,69,0.3)',
                        cursor: 'pointer', // 항상 포인터 커서
                        opacity: 1,
                        transition: 'all 0.3s ease'
                    }}
                >
                    {itemNo + 1 === words.length ? "FINISH STUDY 🏁" : "NEXT WORD ▶▶"}
                </button>
            </div>
        </div>
    );
};

export default VocaDictation;