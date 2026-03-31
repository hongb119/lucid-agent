import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminAnswerForm = ({ level, branchCode = 'HEAD' }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 문제 목록 불러오기
  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/questions/${level}?branch_code=${branchCode}`);
      setQuestions(res.data.questions);
    } catch (err) {
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (level) fetchQuestions();
  }, [level]);

  // 2. 정답 변경 핸들러
  const handleAnswerChange = (id, value) => {
    setQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, correct_answer: value } : q)
    );
  };

  // 3. 일괄 저장
  const handleSaveAll = async () => {
    const updates = questions.map(q => ({
      question_id: q.id,
      correct_answer: q.correct_answer || '',
      commentary: q.commentary || ''
    }));

    try {
      await axios.post('/api/admin/update-answers', updates);
      alert("모든 정답이 성공적으로 저장되었습니다!");
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3>🎯 {level} 레벨 정답 설정</h3>
        <button onClick={handleSaveAll} style={saveBtnStyle}>일괄 저장하기</button>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={thStyle}>번</th>
            <th style={thStyle}>지문 및 문제</th>
            <th style={thStyle}>보기 및 정답 선택</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.id} style={trStyle}>
              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{q.q_number}</td>
              <td style={{ fontSize: '0.9rem' }}>
                <div style={{ color: '#666', marginBottom: '5px' }}>{q.instruction}</div>
                <div style={{ fontWeight: '500' }}>{q.question_text}</div>
              </td>
              <td>
                <div style={optionGroupStyle}>
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <label key={opt} style={labelStyle}>
                      <input 
                        type="radio" 
                        name={`q-${q.id}`} 
                        value={opt}
                        checked={q.correct_answer === opt}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      />
                      <span style={{ marginLeft: '5px' }}>
                        {opt}. {q[`option_${opt.toLowerCase()}`]}
                      </span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- Styles ---
const tableStyle = { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' };
const thStyle = { padding: '12px', border: '1px solid #ddd' };
const trStyle = { borderBottom: '1px solid #eee' };
const labelStyle = { display: 'block', margin: '5px 0', cursor: 'pointer', fontSize: '0.85rem' };
const optionGroupStyle = { display: 'flex', flexDirection: 'column', gap: '2px' };
const saveBtnStyle = { padding: '10px 20px', backgroundColor: '#4A90E2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default AdminAnswerForm;