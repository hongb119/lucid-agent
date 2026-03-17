import React from 'react';

const VocaFinish = ({ onRetry, onNext }) => {
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
                            다음 단계 학습을 계속하려면 NEXT 버튼을 클릭하세요.<br />
                        </span>
                    </p>
                </div>
            </div>

            <div className="conbox3">
                <div className="bigbtns">
                    <div className="wid50">
                        <button type="button" className="bigb1" onClick={onRetry}>
                            <img src="/static/study/images/btn_big1.png" alt="" /> RETRY
                        </button>
                    </div>
                    <div className="wid50">
                        <button type="button" className="bigb2" onClick={onNext}>
                            <img src="/static/study/images/btn_big2.png" alt="" /> NEXT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VocaFinish;