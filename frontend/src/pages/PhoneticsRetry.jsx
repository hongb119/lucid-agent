import React from 'react';

const PhoneticsRetry = ({ failCount, onRetry }) => {
    return (
        <div id="agent-content" className="educontainer">
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="안내" />
                    </p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            QUIZ 학습을 완료했어요. <br/>
                            그런데 틀린 QUIZ가 <strong>{failCount}개</strong> 있어요.<br/>
                            우리 틀린 문제만 한 번 더 학습해요!
                        </span>
                    </p>
                </div>
            </div>

            <div className="conbox3">
                <div className="bigbtns">
                    <div className="wid50 w1">
                        <button type="button" className="bigb1" onClick={onRetry}>
                            <img src="/static/study/images/btn_big1.png" alt="RETRY" /> 
                            RETRY
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhoneticsRetry;