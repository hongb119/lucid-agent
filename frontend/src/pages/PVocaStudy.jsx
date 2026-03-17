import React, { useState, useEffect, useRef } from 'react';

const PVocaStudy = ({ words, onComplete }) => {
    const [idx, setIdx] = useState(0);
    const [subStep, setSubStep] = useState(1); // 1:이미지+음성, 2:영어(이미지Blur), 3:한글뜻
    const audioRef = useRef(new Audio());
    const cur = words[idx];

    useEffect(() => {
        if (subStep === 1 && cur?.study_mp3_file) {
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${cur.study_mp3_file}`;
            audioRef.current.play().catch(() => {});
        }
    }, [idx, subStep]);

    const handleAction = () => {
        if (subStep < 3) setSubStep(subStep + 1);
        else {
            if (idx + 1 < words.length) { setIdx(idx + 1); setSubStep(1); }
            else onComplete();
        }
    };

    if (!cur) return null;

    return (
        <div className="conbox-flex">
            <div className="conbox1">
                <div className="speech"><p className="bubble_tx"><span className="tx_box">단어를 잘 듣고 따라 읽으세요.</span></p></div>
                <div className="numbox"><span>{idx + 1}/{words.length}</span></div>
            </div>
            <div className="conbox2" onClick={handleAction} style={{ cursor: 'pointer' }}>
                <div className="boxline imgnoline">
                    <div className="boxtext" style={{ minHeight: '450px' }}>
                        {/* 단계별 이미지 블러 효과 */}
                        <div className="boximgw" style={{ filter: subStep >= 2 ? 'blur(10px)' : 'none', transition: '0.4s' }}>
                            <img src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${cur.study_img_file}`} alt="word" />
                        </div>
                        <div style={{ marginTop: '20px', minHeight: '130px' }}>
                            {subStep >= 2 && <div className="imgtext_en" style={{ fontSize: '52px', fontWeight: 'bold', color: '#6F6BE6' }}>{cur.study_eng}</div>}
                            {subStep >= 3 && <div className="imgtext_ko" style={{ fontSize: '32px', color: '#666', marginTop: '10px' }}>{cur.study_kor}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PVocaStudy;