import React, { useState, useEffect, useRef } from 'react';

const RVocaStudy = ({ words, onComplete }) => {
    const [idx, setIdx] = useState(0);
    const audioRef = useRef(new Audio());
    const cur = words[idx];

    useEffect(() => {
        if (cur?.study_mp3_file) {
            audioRef.current.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${cur.study_mp3_file}`;
            audioRef.current.play().catch(() => {});
        }
    }, [idx]);

    if (!cur) return null;

    return (
        <div className="conbox-flex">
            <div className="conbox1">
                <div className="speech"><p className="bubble_tx"><span className="tx_box">틀린 단어를 다시 한번 복습하세요!</span></p></div>
                <div className="numbox"><span>{idx + 1}/{words.length}</span></div>
            </div>
            <div className="conbox2" onClick={() => (idx + 1 < words.length ? setIdx(idx + 1) : onComplete())} style={{ cursor: 'pointer' }}>
                <div className="boxline imgnoline">
                    <div className="boxtext">
                        <div className="boximgw" style={{ width: '200px', margin: '0 auto' }}>
                            <img src={`https://admin.lucideducation.co.kr/uploadDir/study/img/${cur.study_img_file}`} alt="word" />
                        </div>
                        <div className="imgtext_en" style={{ fontSize: '60px', fontWeight: 'bold', color: '#E91E63' }}>{cur.study_eng}</div>
                        <div className="imgtext_ko" style={{ fontSize: '36px', color: '#333' }}>{cur.study_kor}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RVocaStudy;