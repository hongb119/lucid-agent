import React, { useState } from 'react';
import { Card, Row, Col, Typography, Tag, Divider, Button, Space } from 'antd';
import { FileZipOutlined, SwapRightOutlined, RocketOutlined } from '@ant-design/icons';
import WordPlayer from './WordPlayer';

const { Title, Text, Paragraph } = Typography;

const FlashToReactDemo = () => {
  // 1. 플래시(.swf)에서 추출한 가상의 원시 데이터
  const flashResources = {
    fileName: "lesson_01_voca.swf",
    extractedAssets: [
      { id: "img01", type: "PNG", name: "apple_image" },
      { id: "snd01", type: "MP3", name: "apple_sound" },
      { id: "txt01", type: "ActionScript", value: "Apple / 사과" }
    ]
  };

  // 2. 리액트 엔진이 읽을 수 있게 정형화된 JSON 데이터 (오늘 만든 플레이어용)
  const convertedData = [
    { word: "Apple", meaning: "사과", image: "🍎", phonetic: "[æpl]" },
    { word: "Banana", meaning: "바나나", image: "🍌", phonetic: "[bənǽnə]" },
    { word: "Cherry", meaning: "체리", image: "🍒", phonetic: "[tʃéri]" }
  ];

  return (
    <div style={{ padding: '30px', backgroundColor: '#f0f5ff', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2}><RocketOutlined /> Lucid Flash Modernization Project</Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          기존 플래시(SWF) 리소스를 HTML5 리액트 엔진으로 전환하는 프로세스 시연
        </Text>
      </div>

      <Row gutter={24}>
        {/* 왼쪽: 기존 플래시 데이터 자산 분석 */}
        <Col span={8}>
          <Card 
            title={<span><FileZipOutlined /> Legacy Flash Assets</span>} 
            variant="borderless"
            style={{ height: '100%', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          >
            <Tag color="error">SWF Container</Tag>
            <Paragraph style={{ marginTop: '15px' }}>
              <strong>Source:</strong> {flashResources.fileName}
            </Paragraph>
            <Divider orientation="left" plain style={{ fontSize: '12px' }}>Extracted Items</Divider>
            <ul style={{ paddingLeft: '20px', lineHeight: '2.5' }}>
              {flashResources.extractedAssets.map(asset => (
                <li key={asset.id}>
                  <Text code>{asset.type}</Text> <Text strong>{asset.name}</Text>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: '30px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', color: '#1890ff' }}><SwapRightOutlined /></div>
              <Text type="secondary">JSON 데이터로 정형화 및 추출</Text>
            </div>
          </Card>
        </Col>

        {/* 오른쪽: 리액트 표준 엔진 구동 화면 */}
        <Col span={16}>
          <Card 
            title={<span><RocketOutlined /> New React Learning Engine</span>} 
            variant="borderless"
            style={{ borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,51,102,0.1)' }}
          >
            <div style={{ padding: '10px', backgroundColor: '#fffbe6', borderRadius: '10px', marginBottom: '20px', border: '1px solid #ffe58f' }}>
              <Text strong style={{ color: '#d48806' }}>✅ 엔진 상태: </Text>
              <Text>표준 WordPlayer (v1.0) 구동 중 - JSON 데이터 로드 완료</Text>
            </div>

            {/* 우리가 만든 WordPlayer를 그대로 재사용! */}
            <div style={{ border: '2px dashed #d9d9d9', borderRadius: '20px', padding: '10px' }}>
              <WordPlayer 
                data={convertedData} 
                onFinish={() => alert("변환된 데이터로 학습을 완료했습니다!")} 
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 하단 설명 영역 */}
      <Card variant="borderless" style={{ marginTop: '24px', borderRadius: '20px', backgroundColor: '#001529' }}>
        <Row align="middle">
          <Col span={18}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>이 방식의 핵심 장점</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
              일일이 코딩하지 않고 데이터만 추출하여 표준 엔진에 주입함으로써 전환 속도를 10배 이상 높입니다.
            </Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button type="primary" size="large" ghost style={{ borderRadius: '10px' }}>
              기술 제안서 보기
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default FlashToReactDemo;