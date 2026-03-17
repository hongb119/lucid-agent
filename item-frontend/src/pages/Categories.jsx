import React, { useState, useEffect } from 'react';
import api from '../api/axios'; // 이전에 설정한 axios 인스턴스

const CategoryNode = ({ node, onRefresh }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleAddSub = async () => {
    const subName = prompt(`'${node.category_name}' 하위에 추가할 분류명을 입력하세요:`);
    if (subName) {
      try {
        await api.post('/categories/', {
          category_name: subName,
          parent_id: node.category_id,
          depth: (node.depth || 0) + 1 // depth 안전하게 처리
        });
        onRefresh();
      } catch (err) {
        alert("분류 추가에 실패했습니다.");
      }
    }
  };

  return (
    <div style={{ marginLeft: '25px', marginTop: '10px', borderLeft: '1px dashed #cbd5e1', paddingLeft: '15px' }}>
      <div style={styles.itemRow}>
        <span onClick={() => setIsOpen(!isOpen)} style={styles.toggleIcon}>
          {/* children이 배열이고 데이터가 있는지 안전하게 확인 */}
          {Array.isArray(node.children) && node.children.length > 0 ? (isOpen ? '▼' : '▶') : '•'}
        </span>
        <span style={styles.categoryName}>{node.category_name}</span>
        <button onClick={handleAddSub} style={styles.miniBtn}>+ 추가</button>
      </div>

      {/* ⭐ 자식 노드 렌더링 시에도 배열 확인 필수 */}
      {isOpen && Array.isArray(node.children) && node.children.map(child => (
        <CategoryNode key={child.category_id} node={child} onRefresh={onRefresh} />
      ))}
    </div>
  );
};

const Categories = () => {
  const [treeData, setTreeData] = useState([]); // 초기값 빈 배열

  const loadTree = async () => {
    try {
      const res = await api.get('/categories/tree');
           
      // 🔍 중요: 백엔드에서 온 데이터가 뭔지 브라우저 콘솔(F12)에서 확인하기 위함
      console.log("🛠️ 백엔드 응답 데이터:", res.data);

      // 데이터가 배열(List)일 때만 저장
      if (Array.isArray(res.data)) {
        setTreeData(res.data);
      } else {
        // 만약 배열이 아니라면 (예: {"detail": "Error..."}) 빈 배열로 초기화
        console.error("데이터 형식이 배열이 아닙니다. 응답을 확인하세요.");
        setTreeData([]); 
      }
    } catch (err) {
      console.error("트리 로딩 실패:", err);
      setTreeData([]);
    }
  };

  useEffect(() => { loadTree(); }, []);

  useEffect(() => { loadTree(); }, []);

  const handleAddRoot = async () => {
    const rootName = prompt("최상위 분류명을 입력하세요:");
    if (rootName) {
      await api.post('/categories/', {
        category_name: rootName,
        parent_id: null,
        depth: 0
      });
      loadTree();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📂 문항 분류 체계 관리</h2>
        <button onClick={handleAddRoot} style={styles.mainBtn}>+ 최상위 분류 추가</button>
      </div>
      <div style={styles.treeWrapper}>
        {/* ⭐ 방어 코드: treeData가 배열이고 데이터가 있을 때만 map 실행 */}
        {Array.isArray(treeData) && treeData.length > 0 ? (
          treeData.map(node => (
            <CategoryNode key={node.category_id} node={node} onRefresh={loadTree} />
          ))
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
            등록된 분류가 없습니다. <br/>
            (백엔드 응답이 비어있거나 에러가 발생했을 수 있습니다.)
          </p>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e3a8a' },
  mainBtn: { padding: '10px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  treeWrapper: { backgroundColor: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' },
  itemRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' },
  toggleIcon: { cursor: 'pointer', color: '#64748b', fontSize: '14px', width: '20px' },
  categoryName: { fontSize: '16px', color: '#334155', fontWeight: '500' },
  miniBtn: { padding: '2px 8px', fontSize: '12px', color: '#3b82f6', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '4px', cursor: 'pointer' }
};

export default Categories;