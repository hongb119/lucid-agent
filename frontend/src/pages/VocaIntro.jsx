import React from 'react';

const VocaIntro = ({ onStart }) => {
    return (
        <div className="start_page" style={{ textAlign: 'center' }}>
            <p className="t1">신나는 LUCID WORD 학습을 <span className="inline"></span>시작할게요.</p>
            <p className="t2">준비가 되었으면 START 버튼을 클릭해주세요.</p>
            
            {/* 버튼 크기 확대 및 스타일 추가 */}
            <button 
                type="button" 
                onClick={onStart}
                style={{
                    marginTop: '30px',
                    padding: '20px 60px',  // 위아래, 좌우 여백을 크게
                    fontSize: '28px',      // 글자 크기 확대
                    fontWeight: 'bold',    // 굵게
                    borderRadius: '50px',  // 둥근 버튼
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)', // 입체감 추가
                    cursor: 'pointer'
                }}
            >
                START
            </button>
        </div>
    );
};

export default VocaIntro;