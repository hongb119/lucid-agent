import React from 'react';

const SmallTalk_intro = ({ onStart }) => {
    return (
        <div className="agent-ipad" style={{ display: 'block' }}>
            <div className="start_page">
                <p className="t1">신나는 LUCID SMALL TALK 학습을 시작할게요.</p>
                <p className="t2">원어민 선생님의 질문을 잘 듣고 큰 소리로 대답해 보세요!</p>
                <button 
                    type="button" 
                    className="start-button" 
                    onClick={onStart}
                    style={{
                        padding: '15px 40px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                        marginTop: '20px'
                    }}
                >
                    START
                </button>
            </div>
        </div>
    );
};

export default SmallTalk_intro;