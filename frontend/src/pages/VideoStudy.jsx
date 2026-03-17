import React, { useState, useEffect } from 'react';

const VideoStudy = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchVideos = async () => {
        setLoading(true);
        console.log("1. 리액트 실행됨 - API 호출 시작");
        
        // Vite 프록시(/api)를 통해 백엔드 8000번 포트로 호출
        try {
            const res = await fetch('/api/video/list?step1=001&step2=001');
            console.log("2. 응답 도착!", res.status);
            
            if (!res.ok) throw new Error(`서버 상태: ${res.status}`);
            
            const data = await res.json();
            setVideos(data);
        } catch (err) {
            console.error("3. 호출 실패:", err);
            alert(`API 호출 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    if (loading) return <div style={{padding: '50px', color: 'white', background: '#000'}}>로딩 중...</div>;

    return (
        <div style={{ padding: '20px', background: '#f4f4f4', minHeight: '100vh' }}>
            <h1 style={{ color: '#333' }}>📺 학습 영상 목록</h1>
            <p>API 연동 테스트: {videos.length}개의 영상을 찾았습니다.</p>
            
            <div style={{ marginTop: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                        <tr style={{ background: '#333', color: '#fff' }}>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>번호</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>제목</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>재생시간</th>
                            <th style={{ padding: '10px', border: '1px solid #ddd' }}>선택</th>
                        </tr>
                    </thead>
                    <tbody>
                        {videos.map((v, i) => (
                            <tr key={v.video_id}>
                                <td align="center" style={{ padding: '10px', border: '1px solid #ddd' }}>{i + 1}</td>
                                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{v.video_title}</td>
                                <td align="center" style={{ padding: '10px', border: '1px solid #ddd' }}>{v.play_time}초</td>
                                <td align="center" style={{ padding: '10px', border: '1px solid #ddd' }}>
                                    <button style={{ padding: '5px 10px', cursor: 'pointer' }}>학습하기</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VideoStudy;