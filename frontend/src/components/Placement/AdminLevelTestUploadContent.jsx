import React, { useState } from 'react';
import axios from 'axios';

const AdminLevelTestUploadContent = () => {
  const [file, setFile] = useState(null);
  const [level, setLevel] = useState('Stem');
  const [previewSections, setPreviewSections] = useState([]); // 이름 변경: sections
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  // AdminLevelTestUploadContent.jsx 수정 부분

 const handleAnalyze = async () => {
   if (!file) return alert("분석할 파일을 선택해주세요.");
  
   const formData = new FormData();
   formData.append("pdf_file", file); // 백엔드 파라미터명과 일치
   formData.append("level", level);
   formData.append("category", "Reading");

   setLoading(true);
   try {
      // 🔥 엔드포인트 주소를 통합된 이름으로 변경
      const res = await axios.post('/api/admin/parse-exam-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    if (res.data.status === 'success') {
      setPreviewSections(res.data.sections); // 'questions'가 아닌 'sections'로 받음
      alert("파일 분석이 완료되었습니다.");
    }
   } catch (err) {
    console.error(err);
    alert("분석 중 오류가 발생했습니다. (파일 형식 확인)");
   } finally {
    setLoading(false);
   }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={styles.uploadBox}>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {['Stem', 'Seed', 'Sprout', 'Branch'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleAnalyze} disabled={loading}>{loading ? '분석 중...' : '데이터 추출'}</button>
      </div>

      {/* 미리보기: 2중 Map 구조 */}
      {previewSections.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>추출 결과 ({previewSections.length}개 지문 그룹)</h3>
          {previewSections.map((sec, sIdx) => (
            <div key={sIdx} style={styles.sectionCard}>
              <div style={styles.instruction}>[지시문] {sec.instruction}</div>
              {sec.passage && <div style={styles.passage}>{sec.passage}</div>}
              
              {/* 지문에 속한 문항들 */}
              {sec.questions?.map((q, qIdx) => (
                <div key={qIdx} style={styles.questionBox}>
                  <strong>Q{q.q_number}. {q.question_text}</strong>
                  <div style={styles.optionGroup}>
                    {q.options?.map((opt, oIdx) => (
                      <span key={oIdx} style={styles.optItem}>{String.fromCharCode(97 + oIdx)}. {opt}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  uploadBox: { display: 'flex', gap: '10px', padding: '20px', background: '#f4f4f4' },
  sectionCard: { border: '1px solid #ddd', padding: '15px', marginBottom: '20px', borderRadius: '8px' },
  instruction: { fontWeight: 'bold', color: '#e91e63', marginBottom: '10px' },
  passage: { background: '#f9f9f9', padding: '10px', border: '1px dashed #bbb', marginBottom: '10px' },
  questionBox: { marginTop: '10px', paddingLeft: '15px' },
  optionGroup: { display: 'flex', gap: '15px', marginTop: '5px' },
  optItem: { fontSize: '13px', color: '#666' }
};

export default AdminLevelTestUploadContent;