import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, Tag, Avatar, Typography, Row, Col, Badge, Empty } from 'antd';
import { UserOutlined, HolderOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// 초기 데이터 설정
const initialData = {
  students: {
    'st-1': { id: 'st-1', name: '김철수', level: 'Soil 1', grade: '초3' },
    'st-2': { id: 'st-2', name: '이영희', level: 'Seed 2', grade: '초4' },
    'st-3': { id: 'st-3', name: '박지민', level: 'Soil 2', grade: '초3' },
    'st-4': { id: 'st-4', name: '최하늘', level: 'Sprout 1', grade: '초5' },
  },
  columns: {
    'unassigned': {
      id: 'unassigned',
      title: '미배정 학생',
      studentIds: ['st-1', 'st-2', 'st-3', 'st-4'],
      color: '#f5f5f5'
    },
    'class-A': {
      id: 'class-A',
      title: '파닉스 A반',
      studentIds: [],
      color: '#e6f7ff'
    },
    'class-B': {
      id: 'class-B',
      title: '스피킹 기초반',
      studentIds: [],
      color: '#f6ffed'
    },
  },
  columnOrder: ['unassigned', 'class-A', 'class-B'],
};

const ClassAssignment = () => {
  const [data, setData] = useState(initialData);

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    // 같은 열 내에서 이동
    if (start === finish) {
      const newStudentIds = Array.from(start.studentIds);
      newStudentIds.splice(source.index, 1);
      newStudentIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...start, studentIds: newStudentIds };
      setData({ ...data, columns: { ...data.columns, [newColumn.id]: newColumn } });
      return;
    }

    // 다른 열로 이동 (반 배정)
    const startStudentIds = Array.from(start.studentIds);
    startStudentIds.splice(source.index, 1);
    const newStart = { ...start, studentIds: startStudentIds };

    const finishStudentIds = Array.from(finish.studentIds);
    finishStudentIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, studentIds: finishStudentIds };

    setData({
      ...data,
      columns: { ...data.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
    });
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <Title level={2}>학생 반 배정 관리</Title>
      <Text type="secondary">학생 카드를 원하는 반으로 드래그하여 배정하세요.</Text>

      <DragDropContext onDragEnd={onDragEnd}>
        <Row gutter={20} style={{ marginTop: '30px' }}>
          {data.columnOrder.map((columnId) => {
            const column = data.columns[columnId];
            const students = column.studentIds.map((id) => data.students[id]);

            return (
              <Col span={8} key={column.id}>
                <div style={{ backgroundColor: column.color, padding: '15px', borderRadius: '15px', minHeight: '500px', border: '1px solid #f0f0f0' }}>
                  <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={4} style={{ margin: 0 }}>{column.title}</Title>
                    <Badge count={students.length} showZero color="#1890ff" />
                  </div>

                  <Droppable droppableId={column.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: '400px' }}>
                        {students.length > 0 ? (
                          students.map((student, index) => (
                            <Draggable key={student.id} draggableId={student.id} index={index}>
                              {(provided) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  size="small"
                                  style={{ marginBottom: '10px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <HolderOutlined style={{ color: '#bfbfbf' }} />
                                    <Avatar icon={<UserOutlined />} />
                                    <div>
                                      <div style={{ fontWeight: 'bold' }}>{student.name}</div>
                                      <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{student.grade} | {student.level}</div>
                                    </div>
                                  </div>
                                </Card>
                              )}
                            </Draggable>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', paddingTop: '100px', color: '#bfbfbf' }}>
                            <Empty description="학생 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          </div>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </Col>
            );
          })}
        </Row>
      </DragDropContext>
    </div>
  );
};

export default ClassAssignment;