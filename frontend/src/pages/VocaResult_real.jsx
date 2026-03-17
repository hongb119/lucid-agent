import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VocaResult = ({ params, words }) => {
    const [aiComment, setAiComment] = useState("");
    
    useEffect(() => {
        // 학습 완료 데이터 전송 및 리포트 생성
        const currentHost = window.location.hostname;
        axios.post(`/api/voca/save-result`, {
            ...params,
            study_no: words[0].study_no,
            results: words.map(w => ({ word: w.study_eng, is_correct: w.input_eng_pass === 'Y' }))
        }).then(res => {
            setAiComment(res.data.ai_comment);
        });
    }, []);

    return (
        <div className="educontainer">
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_tx">
                        <span className="tx_box">
                            학습을 완료했습니다!<br/>
                            AI 선생님 루아이의 총평: <br/>
                            <strong>{aiComment || "로딩 중..."}</strong>
                        </span>
                    </p>
                </div>
            </div>
            <div className="ftbtns ver1">
                <button type="button" className="btn_finish" onClick={() => window.close()}>
                    학습 종료
                </button>
            </div>
        </div>
    );
};

export default VocaResult;