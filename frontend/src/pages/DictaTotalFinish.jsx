import React from 'react';

const DictaTotalFinish = ({ reportData, onRetry, onExit }) => {
    // 💡 백엔드 응답 구조: res.data = { result_code: "200", report: {...}, tracking_logs: [...] }
    const report = reportData?.report;
    const logs = reportData?.tracking_logs || [];

    // 점수 및 오답 개수 계산
    const totalCount = logs.length;
    const correctCount = logs.filter(log => log.try_count === 1).length;
    const failCount = totalCount - correctCount;
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    // 💡 FINISH 버튼 클릭 시 실행될 함수
    const handleFinishClick = () => {
        if (onExit) {
            onExit(); // DictaMain에서 전달받은 종료 핸들러 실행
        } else {
            // 예외 상황 대비 직접 창닫기 시도
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.location.reload();
                }
            } catch (e) {}
            window.close();
        }
    };

    return (
        <div className="educontainer">
            {/* 상단 결과 메시지 영역 */}
            <div className="conbox1 w1">
                <div className="speech">
                    <p className="bubble_icon">
                        <img src="/static/study/images/icon01.png" alt="캐릭터" />
                    </p>
                    <p className="bubble_tx">
                        <span className="tx_box">
                            {score === 100 ? (
                                <>
                                    와우! 축하해요. 모든 QUIZ를 맞추었어요.<br />
                                    아무래도 학생은 영어 천재인가 봐요!
                                </>
                            ) : (
                                <>
                                    총 {totalCount}문제 중 <strong>{failCount}개</strong>가 틀렸네요. 실망하지 마세요.<br />
                                    다음에는 분명 다 맞출 수 있을 거예요.
                                </>
                            )}
                        </span>
                    </p>
                </div>
            </div>

            {/* 상세 분석 리포트 영역 */}
            <div className="conbox7">
                <div className="quiz_tx">
                    <p className="qtx1">학습 상세 리포트</p>
                    <div className="qtx2_w">
                        <p className="qtx2">
                            <img src="/static/study/images/icon04.png" alt="정답" /> 정답 여부
                        </p>
                        <p className="qtx2">
                            <img src="/static/study/images/icon05.png" alt="시도" /> 시도 횟수
                        </p>
                    </div>
                </div>

                <div className="quiz_re">
                    {logs.length > 0 ? (
                        logs.map((log, idx) => (
                            <div 
                                key={idx} 
                                className={`re_line ${log.try_count > 1 ? 're_x' : ''}`}
                            >
                                <div className="line1">
                                    <span>{log.study_item_no}</span>
                                </div>
                                <div className="line2">
                                    <p>문항 소요 시간: <strong>{log.taken_time}초</strong></p>
                                    <p className="box1">
                                        {log.try_count === 1 
                                            ? "한 번에 통과! 👍" 
                                            : `${log.try_count}번 시도 끝에 성공`
                                        }
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no_data" style={{ padding: '50px', textAlign: 'center', color: '#999' }}>
                            <p>상세 학습 기록을 불러올 수 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="he" style={{ height: '30px' }}></div>

            {/* 하단 컨트롤 버튼 */}
            <div className="ftbtns ver1">
                <button 
                    type="button" 
                    className="btn_return ver1" 
                    onClick={onRetry}
                >
                    <span>
                        <img src="/static/study/images/btn03_1.png" alt="retry" />
                    </span> 
                    RETRY
                </button>
                <div className="fr_btn">
                    <button 
                        type="button" 
                        className="btn_finish" 
                        onClick={handleFinishClick} // 💡 수정된 핸들러 연결
                    >
                        FINISH 
                        <span>
                            <img src="/static/study/images/btn_s08.png" alt="finish" />
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DictaTotalFinish;