from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db, get_db_connection
from app.models import models
# [1] 통합된 database.py에서 get_db(SQLAlchemy용)와 
# get_db_connection(커넥션 풀용)을 상황에 맞게 사용합니다.


router = APIRouter(tags=["Auth"])

# --- 데이터 모델 정의 ---
class LoginRequest(BaseModel):
    login_id: str
    password: str

# [POST] 통합 로그인 처리
@router.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    관리자/원장/교사 및 학생 통합 로그인 로직
    SQLAlchemy Session(db)을 사용하여 기존 모델과 호환됩니다.
    """
    try:
        # 1. 일반 사용자(관리자/원장/교사) 테이블 확인
        # filter 대신 filter_by를 쓰거나 정확한 컬럼명을 대조하세요.
        user = db.query(models.User).filter(models.User.login_id == data.login_id).first()
        
        if user:
            # 실서버 배포 시에는 반드시 해시 검증(bcrypt 등)을 적용해야 합니다.
            if user.password_hash == data.password:
                return {
                    "status": "success",
                    "role": user.role, 
                    "name": user.user_name, 
                    "branch_code": getattr(user, 'branch_code', 'MAIN'), # branch_code 유지
                    "token": "access_token_lucid_admin"
                }

        # 2. 학생 테이블 확인
        student = db.query(models.Student).filter(models.Student.login_id == data.login_id).first()
        
        if student:
            if student.password_hash == data.password:
                return {
                    "status": "success",
                    "role": "STUDENT", 
                    "name": student.student_name, 
                    "user_id": student.login_id,
                    "branch_code": getattr(student, 'branch_code', 'MAIN'), # user code 유지
                    "token": "access_token_lucid_student"
                }

        # 3. 로그인 실패 시
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 잘못되었습니다.")

    except Exception as e:
        print(f"🔥 로그인 처리 중 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="서버 내부 오류가 발생했습니다.")