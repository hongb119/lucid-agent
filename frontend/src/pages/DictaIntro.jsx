import React from 'react';

const DictaIntro = ({ onStart }) => {
    return (
        <div className="educontainer" style={{ background: "rgba(255,255,255,0.6)" }}>
            <div className="start_page">
                <p className="t1">신나는 <span style={{color:'#6F6BE6', fontWeight:'bold'}}>LUCID DICTATION</span> 학습을 시작할게요.</p>
                <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
                {/* 클릭 시 부모 컴포넌트의 학습 시작 시간(startTime)이 기록됩니다. */}
                <button type="button" onClick={onStart}>START</button>
            </div>  
        </div>
    );
};

export default DictaIntro;