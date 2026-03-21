import React from 'react';

const PatternDrill_Intro = ({ step1Name, userId, onStart }) => {
    return (
        <div className="start_page" style={{ paddingTop: '100px' }}>
            {/* 이름을 불러주는 멘트 추가 */}
            <p className="t1">
                신나는 <span style={{ color: '#6F6BE6', fontWeight: 'bold' }}>
                    LUCID {step1Name?.toUpperCase()} SENTENCE
                </span> 학습을 시작할게요.
            </p>
            <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
            
            <button 
                type="button" 
                className="start_btn_origin" 
                onClick={onStart}
                style={{
                    padding: '15px 50px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    backgroundColor: '#6F6BE6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '35px',
                    cursor: 'pointer',
                    boxShadow: '0 6px 12px rgba(111, 107, 230, 0.3)',
                    marginTop: '40px',
                    transition: 'all 0.3s'
                }}
            >
                START
            </button>
        </div>
    );
};

export default PatternDrill_Intro;