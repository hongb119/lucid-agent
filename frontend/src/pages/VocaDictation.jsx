import React, { useState, useEffect, useRef } from 'react';

const VocaDictation = ({ words, onComplete }) => {
    const [itemNo, setItemNo] = useState(0); 
    const [playCnt, setPlayCnt] = useState(1); 
    const [playState, setPlayState] = useState(true); 
    const audioRef = useRef(new Audio());
    const cur = words[itemNo];

    // [로직] 단어 진입 및 음성 자동 재생
    useEffect(() => {
        if (cur) {
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${cur.study_mp3_file}`;
            fnMp3Play();
        }
    }, [itemNo]);

    const fnMp3Play = () => {
        setPlayState(true);
        audioRef.current.play().catch(() => setPlayState(false));
    };

    // [로직] 음성 종료 감지
    useEffect(() => {
        const audio = audioRef.current;
        const fnMp3Stop = () => {
            setPlayState(false); 
        };
        audio.addEventListener('ended', fnMp3Stop);
        return () => audio.removeEventListener('ended', fnMp3Stop);
    }, []);

    // [로직] 카드 클릭 (단계별 전환 1->2->3)
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
            // 3단계 완료 후 클릭 시 다음 단어로 이동
            handleNextWord();
        }
    };

    // [로직 추가] 다음 단어로 강제 이동 버튼 클릭 시
    const handleNextWord = () => {
        // 음성 재생 중에는 클릭 방지 (데이터 정합성 보장)
        if (playState) return;

        if (itemNo + 1 === words.length) {
            onComplete(); // 마지막 단어면 결과 화면으로
        } else {
            setPlayCnt(1);
            setItemNo(prev => prev + 1); // 다음 단어 인덱스 증가
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
                            이미지를 클릭하며 음성을 따라 말해보세요. (3회 반복)<br />
                            <b>하단 NEXT 버튼</b>을 누르면 다음 단어로 바로 이동합니다.
                        </span>
                    </p>
                </div>
                <div className="numbox"><span>{itemNo + 1}/{words.length}</span></div>
            </div>

            {/* 카드 클릭 영역 */}
            <div className="conbox2" onClick={handleViewClick} style={{ cursor: playState ? 'not-allowed' : 'pointer' }}>
                <div className="boxline imgnoline">
                    <div className="boxtext">
                        <div className="boximgw" style={{minHeight:'350px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
                            <img 
                                key={`voca-img-${itemNo}`} // 이미지 갱신 강제화
                                src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${cur.study_img_file}`} 
                                className={`imgfun ${playCnt >= 2 ? 'ckevent' : ''}`}
                                style={{ 
                                    maxHeight: '300px',
                                    filter: playCnt >= 2 ? 'blur(8px)' : 'none',
                                    transition: 'filter 0.5s ease'
                                }}
                                alt="" 
                            />
                            
                            {playCnt === 2 && (
                                <p className="imgtext_en" style={{ display: 'block' }}>
                                    <span style={{fontSize:'42px', fontWeight:'bold', color:'#333'}}>{cur.study_eng}</span>
                                </p>
                            )}
                            
                            {playCnt === 3 && (
                                <p className="imgtext_ko" style={{ display: 'block' }}>
                                    <span style={{fontSize:'42px', fontWeight:'bold', color:'#e91e63'}}>{cur.study_kor}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 하단 버튼 및 NEXT 버튼 영역 */}
            <div className="btns m_txcenter" style={{marginTop:'30px', display:'flex', flexDirection:'column', alignItems:'center', gap:'20px'}}>
                <div style={{display:'flex', gap:'10px'}}>
                    <button type="button" className={`numbtn ${playCnt === 1 ? 'on' : ''}`}>1</button>
                    <button type="button" className={`numbtn ${playCnt === 2 ? 'on' : ''}`}>2</button>
                    <button type="button" className={`numbtn ${playCnt === 3 ? 'on' : ''}`}>3</button>
                </div>

                {/* [추가] 다음 단어 이동 버튼 */}
                <button 
                    type="button" 
                    onClick={handleNextWord}
                    disabled={playState}
                    style={{
                        width: '240px',
                        padding: '15px 0',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        backgroundColor: playState ? '#ccc' : '#28a745',
                        color: '#fff',
                        borderRadius: '50px',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(40,167,69,0.3)',
                        cursor: playState ? 'wait' : 'pointer'
                    }}
                >
                    {itemNo + 1 === words.length ? "FINISH STUDY 🏁" : "NEXT WORD ▶▶"}
                </button>
            </div>
        </div>
    );
};

export default VocaDictation;