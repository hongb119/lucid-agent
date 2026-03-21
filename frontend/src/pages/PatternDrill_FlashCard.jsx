import React, { useState, useEffect, useRef } from 'react';

const PatternDrill_FlashCard = ({ contents, onComplete }) => {
    const [itemNo, setItemNo] = useState(0);
    const [playCnt, setPlayCnt] = useState(1); // 1:이미지, 2:영어, 3:한글
    const [isPlaying, setIsPlaying] = useState(false);
    
    const audioRef = useRef(new Audio());
    const currentItem = contents[itemNo];

    // [기능 복구] 문장 진입 시 1단계(이미지) 리셋 및 첫 음성 자동 재생
    useEffect(() => {
        if (currentItem) {
            setPlayCnt(1); 
            playAudio(currentItem.study_mp3_file);
        }
    }, [itemNo]);

    const playAudio = (file) => {
        if (!file) return;
        setIsPlaying(true);
        audioRef.current.pause();
        // 루시드 표준 경로 적용
        audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${file}`;
        audioRef.current.play().catch(() => setIsPlaying(false));
        audioRef.current.onended = () => setIsPlaying(false);
    };

    // [핵심 로직] 중앙 카드 클릭 시 단계별 전환 (이미지 -> 영어 -> 한글)
    const handleCardClick = () => {
        if (isPlaying) return; // 음성 재생 중 클릭 방지

        if (playCnt < 3) {
            setPlayCnt(prev => prev + 1);
            playAudio(currentItem.study_mp3_file); // 단계 바뀔 때마다 음성 재생
        } else {
            // 3단계(한글)까지 본 후 클릭하면 다음 문장으로 이동
            handleNext();
        }
    };

    const handleNext = () => {
        if (itemNo + 1 < contents.length) {
            setItemNo(prev => prev + 1);
        } else {
            // 모든 문장 종료 시 부모의 다음 모드(DRILL)로 이동
            onComplete(); 
        }
    };

    if (!currentItem) return null;

    return (
        <div className="educontainer" style={{ background: "rgba(255,255,255,0.6)" }}>
            <div className="conbox-flex">
                {/* [기능 보존] 상단 안내 메시지 및 문항 수 표시 */}
                <div className="conbox1">
                    <div className="speech">
                        <p className="bubble_icon"><img src="/static/study/images/icon01.png" alt="" /></p>
                        <p className="bubble_tx">
                            <span className="tx_box">
                                이미지를 클릭하면서 들려주는 음성을 큰 소리로 따라 말해보세요. 
                                <br/>총 3번을 반복해야 해요.
                            </span>
                        </p>
                    </div>
                    <div className="numbox"><span>{itemNo + 1}/{contents.length}</span></div>
                </div>

                {/* [버그 해결] key={itemNo}를 부여하여 다음 문장 클릭 시 이미지가 즉시 바뀌도록 강제 갱신 */}
                <div className="conbox2" onClick={handleCardClick} style={{ cursor: isPlaying ? 'wait' : 'pointer' }}>
                    <div className="boxline imgnoline" key={`flash-card-wrap-${itemNo}`}>
                        <div className="boxtext">
                            <div className="boximgw" style={{ minHeight: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                
                                {/* 1단계: 이미지 노출 */}
                                {playCnt === 1 && (
                                    <img 
                                        key={`img-${itemNo}`} 
                                        src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${currentItem.study_img_file}`} 
                                        alt="study" 
                                        style={{ maxHeight: '300px', objectFit: 'contain' }} 
                                    />
                                )}

                                {/* 2단계: 영어 문장 노출 */}
                                {playCnt === 2 && (
                                    <div key={`en-${itemNo}`} style={{ textAlign: 'center', padding: '20px' }}>
                                        <span style={{ fontSize: '42px', fontWeight: 'bold', color: '#2c3e50', wordBreak: 'keep-all' }}>
                                            {currentItem.study_eng}
                                        </span>
                                    </div>
                                )}

                                {/* 3단계: 한글 해석 노출 */}
                                {playCnt === 3 && (
                                    <div key={`ko-${itemNo}`} style={{ textAlign: 'center', padding: '20px' }}>
                                        <span style={{ fontSize: '42px', fontWeight: 'bold', color: '#e91e63', wordBreak: 'keep-all' }}>
                                            {currentItem.study_kor}
                                        </span>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 컨트롤 영역 */}
                <div className="btns m_txcenter" style={{ marginTop: '20px' }}>
                    {/* 단계 표시 버튼 (1, 2, 3) */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
                        {[1, 2, 3].map(n => (
                            <button key={n} className={`numbtn ${playCnt === n ? 'on' : ''}`}>{n}</button>
                        ))}
                    </div>
                    
                    {/* 다음 문장 버튼 */}
                    <button 
                        type="button" 
                        className="go_btn" 
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        disabled={isPlaying}
                        style={{ width: '250px', background: isPlaying ? '#ccc' : '#007bff', color: '#fff', border: 'none', height: '50px', borderRadius: '10px', fontSize: '18px', fontWeight: 'bold' }}
                    >
                        {itemNo + 1 < contents.length ? "NEXT SENTENCE ▶▶" : "START DRILL 🚀"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PatternDrill_FlashCard;