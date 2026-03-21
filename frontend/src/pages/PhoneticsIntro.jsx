import React from 'react';

const PhoneticsIntro = ({ onStart }) => {
    console.log('=== PhoneticsIntro 렌더링 ===');
    
    return (
        <div className="agent-ipad" style={{display:'block'}}>
            <div className="start_page">
                <p className="t1">신나는 <span style={{color:'#6F6BE6', fontWeight:'bold'}}>LUCID PHONETICS</span> 학습을 시작할게요.</p>
                <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
                {/* 클릭 시 부모 컴포넌트의 학습 시작 시간(startTime)이 기록됩니다. */}
                <button 
                    type="button" 
                    className="start-button" 
                    onClick={() => {
                        console.log('START 버튼 클릭');
                        onStart();
                    }}
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

export default PhoneticsIntro;
