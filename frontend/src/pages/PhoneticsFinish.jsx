import React from 'react';

const PhoneticsFinish = ({ onRetry, onNext }) => {
    const handleRetry = () => {
        // Phonetics 연습으로 다시 시작
        onRetry();
    };

    const handleNext = () => {
        // 다음 단계(퀴즈)로 이동
        onNext();
    };

    return (
        <div className="educontainer">
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="icon" />
                    </p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            FLASHCARD 학습을 완료 했어요. 금방 끝났죠? <br />
                            다음 단계 학습을 계속하려면 NEXT 버튼을 클릭하세요.
                        </span>
                    </p>
                </div>
            </div>
            
            <div className="conbox3">
                <div className="bigbtns">
                    <div className="wid50">
                        <button 
                            type="button" 
                            className="bigb1" 
                            onClick={handleRetry}
                            style={{
                                padding: '15px 30px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                border: 'none',
                                borderRadius: '5px',
                                backgroundColor: '#007bff',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <img src="/static/study/images/btn_big1.png" alt="" style={{ width: '20px', height: '20px' }} />
                            RETRY
                        </button>
                    </div>
                    <div className="wid50">
                        <button 
                            type="button" 
                            className="bigb2" 
                            onClick={handleNext}
                            style={{
                                padding: '15px 30px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                border: 'none',
                                borderRadius: '5px',
                                backgroundColor: '#28a745',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <img src="/static/study/images/btn_big2.png" alt="" style={{ width: '20px', height: '20px' }} />
                            NEXT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhoneticsFinish;
