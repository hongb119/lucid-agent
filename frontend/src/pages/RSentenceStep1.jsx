import React from 'react';

const RSentenceStep1 = ({ onStart }) => {
    return (
        <div className="start_page">
            <p className="t1">
                신나는 <span className="inline">LUCID DICTATION</span> 학습을 시작할게요.
            </p>
            <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
            <button type="button" onClick={onStart}>START</button>
        </div>
    );
};

export default RSentenceStep1;