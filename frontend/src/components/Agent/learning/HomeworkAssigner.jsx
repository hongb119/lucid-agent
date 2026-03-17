import React, { useState } from 'react';
import { Card, Row, Col, Select, Tree, Button, DatePicker, Tag, Space, message, Typography, Badge } from 'antd';
import { BookOutlined, UsergroupAddOutlined, CalendarOutlined, SendOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const HomeworkAssigner = () => {
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedContent, setSelectedContent] = useState([]);

  // 샘플 데이터
  const classOptions = [
    { label: '파닉스 A반 (담당: 김교사)', value: 'class-a' },
    { label: '파닉스 B반 (담당: 김교사)', value: 'class-b' },
    { label: '스피킹 기초 (담당: 이교사)', value: 'class-c' },
  ];

  const contentTree = [
    {
      title: 'Lucid English 1호',
      key: 'book1',
      children: [
        { title: 'Unit 1. My Family (단어+퀴즈 세트)', key: 'b1-u1-set' },
        { title: 'Unit 2. At School (단어+퀴즈 세트)', key: 'b1-u2-set' },
      ],
    },
  ];

  const handleAssign = () => {
    if (selectedClasses.length === 0 || selectedContent.length === 0) {
      message.warning("반과 학습 콘텐츠를 모두 선택해 주세요.");
      return;
    }
    message.success(`${selectedClasses.length}개 반에 숙제가 성공적으로 전송되었습니다!`);
  };

  return (
    <div style={{ padding: '30px', background: '#f9f9f9', minHeight: '100vh' }}>
      <Title level={3}><BookOutlined /> 숙제 퀵 배정 마법사</Title>
      
      <Row gutter={20} style={{ marginTop: '20px' }}>
        {/* STEP 1: 대상 반 선택 */}
        <Col span={8}>
          <Card title={<span><UsergroupAddOutlined /> 1. 대상 반 선택</span>} style={{ height: '100%', borderRadius: '15px' }}>
            <Text type="secondary">교사/지점 필터 기반</Text>
            <Select
              mode="multiple"
              placeholder="배정할 반을 선택하세요"
              style={{ width: '100%', marginTop: '15px' }}
              onChange={setSelectedClasses}
              options={classOptions}
            />
            <div style={{ marginTop: '15px' }}>
              {selectedClasses.map(c => <Tag color="blue" key={c} style={{ marginBottom: '5px' }}>{c}</Tag>)}
            </div>
          </Card>
        </Col>

        {/* STEP 2: 콘텐츠 선택 */}
        <Col span={8}>
          <Card title={<span><BookOutlined /> 2. 학습 콘텐츠 선택</span>} style={{ height: '100%', borderRadius: '15px' }}>
            <Tree
              checkable
              treeData={contentTree}
              onCheck={(keys) => setSelectedContent(keys)}
            />
          </Card>
        </Col>

        {/* STEP 3: 기한 및 배정 */}
        <Col span={8}>
          <Card title={<span><CalendarOutlined /> 3. 기한 설정 및 완료</span>} style={{ height: '100%', borderRadius: '15px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text>마감 기한 설정:</Text>
              <DatePicker.RangePicker style={{ width: '100%' }} />
              
              <div style={{ marginTop: '40px', textAlign: 'center' }}>
                <Badge count={selectedClasses.length * selectedContent.length} overflowCount={999}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<SendOutlined />} 
                    style={{ width: '200px', height: '60px', borderRadius: '30px', fontSize: '18px' }}
                    onClick={handleAssign}
                  >
                    숙제 배정하기
                  </Button>
                </Badge>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomeworkAssigner;