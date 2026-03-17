import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Card, Typography, Tag, Divider, Row, Col, Statistic, Space, Button, message, Spin } from 'antd';
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  MessageOutlined, 
  StarFilled, 
  AudioOutlined, 
  StopOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const SpeakingTest = ({ userId, branchCode, orgId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // AI 분석 결과 저장용
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 1. 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setAnalysisResult(null); // 새로운 녹음 시 이전 결과 초기화

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // 녹음 중지 시 즉시 서버로 전송
        uploadAudio(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      message.info("녹음을 시작합니다. 문장을 읽어주세요!");
    } catch (err) {
      console.error("마이크 접근 실패:", err);
      message.error("마이크 접근 권한이 필요합니다.");
    }
  };

  // 2. 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 3. 서버 전송 및 AI 분석 결과 수신
  const uploadAudio = async (blob) => {
    setIsUploading(true);
    const formData = new FormData();
    
    // 백엔드 파라미터명과 정확히 일치시킴
    formData.append('user_id', userId || 0);
    formData.append('org_id', orgId || 0);
    formData.append('branch_code', branchCode || 'LUCID_DEFAULT');
    formData.append('audio_file', blob, `record_${userId}.webm`);

    try {
      const response = await axios.post('http://localhost:8000/api/analyze-speaking', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        // 백엔드에서 보낸 ai_analysis 데이터를 상태에 저장
        setAnalysisResult(response.data.ai_analysis);
        message.success("AI 선생님의 분석 리포트가 도착했습니다!");
      }
    } catch (error) {
      console.error('전송 및 분석 실패:', error);
      message.error('AI 분석 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      {/* 상단 컨트롤 섹션 */}
      <Card style={{ borderRadius: '20px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <Title level={2}>🎙️ AI 영어 말하기 훈련</Title>
        <Paragraph type="secondary">문장을 읽고 녹음 버튼을 눌러 AI 선생님의 피드백을 확인하세요.</Paragraph>
        
        <div style={{ margin: '30px 0' }}>
          <div style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            background: isRecording ? '#ff4d4f' : '#1890ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: isRecording ? '0 0 20px rgba(255, 77, 79, 0.5)' : 'none',
            transition: 'all 0.3s'
          }}>
            {isRecording ? <AudioOutlined style={{ fontSize: '40px', color: 'white' }} /> : <RobotOutlined style={{ fontSize: '40px', color: 'white' }} />}
          </div>

          <Space size="middle">
            {!isRecording ? (
              <Button type="primary" size="large" icon={<AudioOutlined />} onClick={startRecording} shape="round">
                녹음 시작하기
              </Button>
            ) : (
              <Button type="primary" danger size="large" icon={<StopOutlined />} onClick={stopRecording} shape="round">
                녹음 중지 및 분석
              </Button>
            )}
          </Space>
        </div>

        {isUploading && (
          <div style={{ marginTop: '20px' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
            <Paragraph style={{ marginTop: '10px', color: '#1890ff', fontWeight: 'bold' }}>
              AI 선생님이 당신의 목소리를 분석 중입니다...
            </Paragraph>
          </div>
        )}

        {audioUrl && !isRecording && (
          <div style={{ marginTop: '20px' }}>
            <Text type="secondary">내 목소리 듣기: </Text>
            <audio src={audioUrl} controls style={{ verticalAlign: 'middle', marginLeft: '10px' }} />
          </div>
        )}
      </Card>

      {/* 하단 리포트 섹션 (결과가 있을 때만 노출) */}
      {analysisResult && (
        <Card 
          style={{ 
            marginTop: 30, 
            borderRadius: 20, 
            border: '2px solid #e6f7ff', 
            boxShadow: '0 10px 30px rgba(24, 144, 255, 0.1)' 
          }}
          bodyStyle={{ padding: '30px' }}
        >
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Title level={3}><CheckCircleOutlined style={{ color: '#52c41a' }} /> 스피킹 분석 결과</Title>
            <Statistic 
              value={analysisResult.score} 
              precision={0}
              valueStyle={{ color: '#3f8600', fontSize: '54px', fontWeight: '900' }}
              prefix={<StarFilled />}
              suffix="점"
            />
          </div>

          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Card title={<Tag color="error">내가 한 말</Tag>} bordered={false} style={{ background: '#fff1f0', borderRadius: '12px', height: '100%' }}>
                <Text style={{ fontSize: '17px', lineHeight: '1.6' }}>{analysisResult.original_text}</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card title={<Tag color="success">AI 추천 표현</Tag>} bordered={false} style={{ background: '#f6ffed', borderRadius: '12px', height: '100%' }}>
                <Text strong style={{ fontSize: '17px', lineHeight: '1.6', color: '#52c41a' }}>{analysisResult.corrected_text}</Text>
              </Card>
            </Col>

            <Col span={24}>
              <Divider orientation="left"><MessageOutlined /> AI 선생님의 첨삭 지도</Divider>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ padding: '20px', background: '#f0f5ff', borderRadius: '15px' }}>
                  <Title level={5} style={{ color: '#1d39c4' }}>📍 문법 포인트</Title>
                  <Paragraph style={{ fontSize: '15px' }}>{analysisResult.grammar_feedback}</Paragraph>
                </div>
                
                <div style={{ padding: '20px', background: '#e6fffb', borderRadius: '15px' }}>
                  <Title level={5} style={{ color: '#08979c' }}>📍 자연스러운 표현</Title>
                  <Paragraph style={{ fontSize: '15px' }}>{analysisResult.naturalness_feedback}</Paragraph>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default SpeakingTest;