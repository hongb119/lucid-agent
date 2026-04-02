import React, { useState } from 'react';
import MicTestModal from './MicTestModal'; 

const SpeakingIntro = ({ onStart }) => {
    const [showMicTest, setShowMicTest] = useState(false);

    return (
        <div className="agent-ipad" style={{ display: 'block' }}>
            <div className="start_page" style={{ textAlign: 'center', padding: '70px 0' }}>
                {/* 상단 큰 타이틀 (크기 32px로 확대) */}
                <p className="t1" style={{ fontSize: '32px', color: '#333', marginBottom: '18px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>
                    신나는 LUCID SPEAKING 학습을 시작할게요.
                </p>
                
                {/* 서브 안내 문구 (크기 20px로 확대) */}
                <p className="t2" style={{ fontSize: '20px', color: '#666', marginBottom: '55px' }}>
                    준비가 되었으면 START 버튼을 클릭해주세요.
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {/* [메인 버튼] 더 크고 웅장하게 (폰트 26px) */}
                    <button 
                        type="button" 
                        onClick={onStart}
                        style={{
                            padding: '22px 110px',
                            fontSize: '26px',
                            fontWeight: '900',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            boxShadow: '0 6px 20px rgba(0,123,255,0.35)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '1px'
                        }}
                    >
                        START
                    </button>

                    {/* [마이크 점검] 기존 14px -> 17px로 확대하여 가독성 확보 */}
                    <button 
                        type="button"
                        onClick={() => setShowMicTest(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: '17px', // 🚩 글자 크기를 키웠습니다.
                            cursor: 'pointer',
                            marginTop: '35px',
                            textDecoration: 'underline',
                            fontWeight: '500',
                            padding: '10px 20px'
                        }}
                    >
                        🎤 마이크가 잘 작동하는지 확인해볼까요? (마이크 점검)
                    </button>
                </div>
            </div>

            {/* 마이크 테스트 모달 */}
            {showMicTest && (
                <MicTestModal 
                    onConfirm={() => setShowMicTest(false)}
                    onClose={() => setShowMicTest(false)}
                />
            )}
        </div>
    );
};

export default SpeakingIntro;