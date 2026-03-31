// src/pages/AdminLevelTestUpload.jsx
import React from 'react';
import AdminLevelTestUploadContent from '../components/Placement/AdminLevelTestUploadContent';

const AdminLevelTestUpload = () => {
    return (
        <div style={{ padding: '30px', backgroundColor: '#f5f7f9', minHeight: '100vh' }}>
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h2 style={{ borderBottom: '2px solid #e91e63', paddingBottom: '10px', color: '#333' }}>
                    📊 레벨테스트 문항 일괄 등록 (PDF 분석)
                </h2>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    시험지 PDF 파일을 업로드하면 AI가 문항, 지문, 보기를 자동으로 분리하여 추출합니다.
                </p>
                <hr />
                {/* 실질적인 업로드 및 분석 컴포넌트 */}
                <AdminLevelTestUploadContent />
            </div>
        </div>
    );
};

export default AdminLevelTestUpload;