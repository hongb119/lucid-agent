from fastapi import APIRouter, Depends, HTTPException
import uuid
import schemas
from database import get_db

router = APIRouter(prefix="/itembank", tags=["Auth"])

@router.post("/login")
async def login(req: schemas.LoginRequest, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        # 1. 관리자(Admin) 로그인
        if req.name == "admin":
            # ⭐ 핵심: DB에서 admin 계정 정보를 실제로 가져와야 합니다!
            cursor.execute("SELECT * FROM users WHERE user_id = 'admin' LIMIT 1")
            user = cursor.fetchone()
            
            if not user:
                # DB에 admin이 없을 경우를 대비한 방어 코드
                return {
                    "access_token": "JWT_TOKEN_HERE",
                    "branch_code": "LUCID001", 
                    "user_name": "관리자",
                    "role": "admin"
                }

            return {
                "access_token": "JWT_TOKEN_HERE",
                "branch_code": user['branch_code'], # 이제 에러 없이 작동합니다!
                "user_name": user['user_name'],
                "role": "admin"
            }

        # 2. 일반 학생 로그인 (test_sessions 기록)
        new_token = str(uuid.uuid4())
        sql = """
            INSERT INTO test_sessions (branch_code, user_name, phone_number, auth_token)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (req.branchCode, req.name, req.phone, new_token))
        db.commit()
        
        return {
            "access_token": new_token,
            "user_name": req.name,
            "branch_code": req.branchCode,
            "role": "student"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()