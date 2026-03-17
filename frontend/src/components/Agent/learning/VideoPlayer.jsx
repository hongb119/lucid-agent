import React, { useState, useRef, useEffect } from 'react';
// 1. 파일을 직접 import 합니다. (변수명은 자유롭지만 아래에서 그대로 써야 합니다)
import videoFile from './1.mp4'; 
import { Card, Button, Progress, Typography, Space, message, Alert } from 'antd';
import { 
  CheckCircleFilled, 
  ReloadOutlined, 
  FastForwardOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

const VideoPlayer = ({ videoUrl, onFinish }) => {
  const videoRef = useRef(null);
  const [playedPercent, setPlayedPercent] = useState(0);
  const [isEnded, setIsEnded] = useState(false);

  // 2. 중요: 문자열 "1.mp4"가 아니라 위에서 import한 'videoFile' 변수를 사용합니다.
  const sampleUrl = videoUrl || videoFile;

  // 영상 경로 변경 시 초기화 로직
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [sampleUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setPlayedPercent(Math.round(progress || 0));
    }
  };

  const handleVideoEnded = () => {
    setIsEnded(true);
    message.success("학습 영상을 끝까지 시청했습니다! 참 잘했어요.");
  };

  const skip = (amount) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ color: '#1890ff' }}>Video Lesson Step 4</Text>
        <Progress 
          percent={playedPercent} 
          status={isEnded ? "success" : "active"} 
          strokeColor="#1890ff"
        />
      </div>

      <Card 
        variant="borderless" // 경고 해결: bordered={false} 대신 사용
        style={{ 
          borderRadius: '25px', 
          overflow: 'hidden', 
          boxShadow: '0 10px 40px rgba(24, 144, 255, 0.1)' 
        }}
      >
        <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '15px', overflow: 'hidden' }}>
          <video 
            ref={videoRef}
            width="100%" 
            controls 
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            style={{ display: 'block' }}
          >
            {/* 3. sampleUrl 변수가 가진 실제 경로를 src에 할당합니다 */}
            <source src={sampleUrl} type="video/mp4" />
            브라우저가 비디오 재생을 지원하지 않습니다.
          </video>
        </div>

        <div style={{ padding: '25px 10px', textAlign: 'center' }}>
          <Title level={3}>오늘의 핵심 표현 익히기</Title>
          <Text type="secondary">영상을 끝까지 시청해야 학습이 완료됩니다.</Text>
          
          <div style={{ marginTop: '30px' }}>
            <Space size="middle">
              <Button icon={<ReloadOutlined />} onClick={() => skip(-10)}>10초 뒤로</Button>
              <Button icon={<FastForwardOutlined />} onClick={() => skip(10)}>10초 앞으로</Button>
            </Space>
          </div>

          <div style={{ marginTop: '40px' }}>
            {isEnded ? (
              <Button 
                type="primary" 
                size="large" 
                shape="round" 
                icon={<CheckCircleFilled />} 
                onClick={onFinish}
                style={{ width: '220px', height: '55px', backgroundColor: '#1890ff', fontSize: '18px' }}
              >
                학습 완료하기
              </Button>
            ) : (
              // 경고 해결: message 대신 title 사용
              <Alert title="영상을 끝까지 시청해 주세요!" type="info" showIcon />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VideoPlayer;