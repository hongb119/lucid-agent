import React from 'react';

const PhoneticsResult = ({ reportData, onRetry, onExit }) => {
    // [방어 코드] 데이터가 로드되기 전 null 참조 에러 방지
    if (!reportData) {
        return (
            <div className="educontainer">
                <div className="loading_box">결과를 집계 중입니다...</div>
            </div>
        );
    }

    const { results, fail_cnt, user_name } = reportData;
    
    // 틀린 문제 개수 및 전체 문항 계산
    const incorrectCount = results ? results.filter(item => item.input_eng_pass === 'N').length : fail_cnt || 0;
    const totalCount = results ? results.length : 0;
    
    // [멘트 살리기] 루시드 특유의 칭찬과 격려 문구
    const scoreMessage = incorrectCount === 0 
        ? `와우! 축하해요. 모든 QUIZ를 맞추었어요.<br/>아무래도 <strong>${user_name || '우리 학생'}</strong>은 영어 천재인가 봐요!`
        : `아쉬워요! <strong>${incorrectCount}개</strong> QUIZ가 틀렸네요. 실망하지 마세요.<br/>틀린 단어들을 확인하고 다음에는 꼭 다 맞춰보아요!`;

    // 오디오 재생 핸들러
    const handlePlayAudio = (mp3File) => {
        if (!mp3File) return;
        const audio = new Audio();
        audio.src = `https://admin.lucideducation.co.kr/uploadDir/study/mp3/${mp3File}`;
        audio.play().catch(e => console.log("오디오 재생 실패:", e));
    };

    // [기존 로직] 재시도 핸들러 (re_study=R 파라미터 유지)
    const handleRetry = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const taskId = queryParams.get('task_id');
        const userId = queryParams.get('user_id');
        window.location.href = `${window.location.pathname}?task_id=${taskId}&user_id=${userId}&re_study=R`;
    };

    // 종료 핸들러
    const handleFinish = () => {
        if (onExit) onExit();
        else window.close();
    };

    return (
        <div className="educontainer">
            {/* 상단 캐릭터 대사 영역 */}
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="캐릭터" />
                    </p>
                    <p className="bubble_tx">
                        <span className="tx_box" dangerouslySetInnerHTML={{ __html: scoreMessage }} />
                    </p>
                </div>
            </div>
            
            {/* 결과 리스트 영역 */}
            <div className="conbox7">
                <div className="quiz_tx">
                    <p className="qtx1">학습 결과 상세</p>
                    <div className="qtx2_w">
                        <p className="qtx2"><img src="/static/study/images/icon04.png" alt="정답" /> 정답</p>
                        <p className="qtx2"><img src="/static/study/images/icon05.png" alt="선택" /> 내가 선택한 답</p>
                    </div>
                </div>

                <div className="quiz_re">
                    {results && results.map((item, index) => (
                        <div 
                            key={index} 
                            /* 틀린 문항일 경우 re_x 클래스를 추가하여 빨간색 X 표시 스타일 적용 */
                            className={`re_line ${item.input_eng_pass === 'N' ? 're_x' : ''}`}
                        >
                            <div 
                                className="line1" 
                                onClick={() => handlePlayAudio(item.study_mp3_file)}
                                title="소리 듣기"
                                style={{ cursor: 'pointer' }}
                            >
                                <span>{index + 1}</span>
                            </div>
                            <div className="line2">
                                {/* 정답 표기 */}
                                <p>{item.study_eng || item.study_word}</p>
                                {/* 학생이 선택한 답 표기 (box1 클래스는 기존 CSS 테두리 스타일) */}
                                <p className="box1">{item.input_eng || '-'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="he"></div>

            {/* 하단 버튼 영역 (RETRY / FINISH) */}
            <div className="ftbtns ver1">
                <button 
                    type="button" 
                    className="btn_return ver1" 
                    onClick={handleRetry}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <span><img src="/static/study/images/btn03_1.png" alt="retry" style={{ width: '18px' }} /></span>
                    RETRY
                </button>

                <div className="fr_btn">
                    <button 
                        type="button" 
                        className="btn_finish" 
                        onClick={handleFinish}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        FINISH 
                        <span><img src="/static/study/images/btn_s08.png" alt="finish" style={{ width: '18px' }} /></span>
                    </button>
                </div>
            </div>

            <style jsx>{`
                .loading_box { 
                    text-align: center; 
                    padding: 50px; 
                    font-size: 1.2rem; 
                    color: #666; 
                }
                .re_line.re_x .line2 .box1 { 
                    color: #ff4d4f; 
                    font-weight: bold; 
                }
                .re_line.re_x::after {
                    content: 'X';
                    position: absolute;
                    right: 20px;
                    color: #ff4d4f;
                    font-size: 24px;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
};

export default PhoneticsResult;