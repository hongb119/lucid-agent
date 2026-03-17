import React, { useState } from 'react';
import { Table, Button, Modal, Select, Space, Tag, message, Card, Typography } from 'antd';
import { UsergroupAddOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const BulkClassAssignment = () => {
  // 1. 학생 데이터 샘플
  const [students, setStudents] = useState([
    { key: '1', name: '김철수', grade: '초3', level: 'Soil 1', currentClass: '미배정' },
    { key: '2', name: '이영희', grade: '초4', level: 'Seed 2', currentClass: '미배정' },
    { key: '3', name: '박지민', grade: '초3', level: 'Soil 2', currentClass: '파닉스 A반' },
    { key: '4', name: '최하늘', grade: '초5', level: 'Sprout 1', currentClass: '미배정' },
    { key: '5', name: '강호동', grade: '초6', level: 'Tree 3', currentClass: '미배정' },
  ]);

  // 2. 선택된 학생들의 키값 저장
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [targetClass, setTargetClass] = useState(null);

  // 테이블 컬럼 설정
  const columns = [
    { title: '이름', dataIndex: 'name', key: 'name' },
    { title: '학년', dataIndex: 'grade', key: 'grade' },
    { title: '레벨', dataIndex: 'level', key: 'level' },
    { 
      title: '현재 반', 
      dataIndex: 'currentClass', 
      key: 'currentClass',
      render: (text) => (
        <Tag color={text === '미배정' ? 'default' : 'blue'}>{text}</Tag>
      )
    },
  ];

  // 체크박스 설정
  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  // 배정 로직 실행
  const handleAssign = () => {
    if (!targetClass) {
      message.warning("배정할 반을 선택해 주세요.");
      return;
    }

    const updatedStudents = students.map(student => {
      if (selectedRowKeys.includes(student.key)) {
        return { ...student, currentClass: targetClass };
      }
      return student;
    });

    setStudents(updatedStudents);
    setIsModalVisible(false);
    setSelectedRowKeys([]);
    setTargetClass(null);
    message.success(`${selectedRowKeys.length}명의 학생이 ${targetClass}에 배정되었습니다.`);
  };

  return (
    <div style={{ padding: '30px' }}>
      <Card variant="borderless" style={{ borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>학생 반 배정 관리</Title>
            <Text type="secondary">배정할 학생을 선택한 후 상단 버튼을 클릭하세요.</Text>
          </div>
          
          <Button 
            type="primary" 
            icon={<UsergroupAddOutlined />} 
            disabled={selectedRowKeys.length === 0}
            onClick={() => setIsModalVisible(true)}
            size="large"
            style={{ borderRadius: '10px', height: '50px' }}
          >
            선택 학생 일괄 배정 ({selectedRowKeys.length}명)
          </Button>
        </div>

        <Table 
          rowSelection={rowSelection} 
          columns={columns} 
          dataSource={students} 
          pagination={false}
          style={{ borderTop: '1px solid #f0f0f0' }}
        />
      </Card>

      {/* 반 배정 팝업 모달 */}
      <Modal
        title="반 배정 설정"
        open={isModalVisible}
        onOk={handleAssign}
        onCancel={() => setIsModalVisible(false)}
        okText="배정 완료"
        cancelText="취소"
        centered
      >
        <div style={{ padding: '20px 0' }}>
          <p><Text strong>{selectedRowKeys.length}명</Text>의 학생을 어느 반으로 이동시킬까요?</p>
          <Select
            placeholder="대상 반 선택"
            style={{ width: '100%', marginTop: '10px' }}
            onChange={(value) => setTargetClass(value)}
            size="large"
          >
            <Option value="파닉스 A반">파닉스 A반 (정원 10/12)</Option>
            <Option value="스피킹 기초반">스피킹 기초반 (정원 5/10)</Option>
            <Option value="중급 문법반">중급 문법반 (정원 8/10)</Option>
            <Option value="미배정">배정 취소 (미배정으로 변경)</Option>
          </Select>
        </div>
      </Modal>
    </div>
  );
};

export default BulkClassAssignment;
