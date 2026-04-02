import React from 'react';

const SpeakingIntro = ({ onStart }) => {
    return (
        <div className="agent-ipad" style={{ display: 'block' }}>
            <div className="start_page">
                {/* 텍스트를 SPEAKING으로 수정했습니다. */}
                <p className="t1">신나는 LUCID SPEAKING 학습을 시작할게요.</p>
                <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
                <button 
                    type="button" 
                    className="start-button" 
                    onClick={onStart}
                    style={{
                        padding: '15px 40px',   // 보카와 동일한 큰 사이즈
                        fontSize: '18px',      // 큰 폰트
                        fontWeight: 'bold',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '25px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        transition: 'all 0.3s ease',
                        marginTop: '20px'      // 간격 확보
                    }}
                    onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#0056b3';
                        e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#007bff';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    START
                </button>
            </div>
        </div>
    );
};

export default SpeakingIntro;