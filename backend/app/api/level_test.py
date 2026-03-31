import re
import json
from pathlib import Path
from typing import Optional  # 👈 추가됨
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel  # 👈 추가됨
from sqlalchemy.orm import Session
from app.database import get_db  # 기존 DB 설정 임포트

# [1] 설정 로드 (경로 에러 방지)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

# --- [데이터 모델 정의] ---
class TestSubmitRequest(BaseModel):
    level: str
    branch_code: Optional[str] = "HEAD"
    temp_name: Optional[str] = "Guest"
    answers: dict

# --- [API 1] 시험지 문항 조회 ---
@router.get("/questions")
async def get_test_questions(level: str, branch_code: str, db = Depends(get_db)):
    # pymysql 등을 사용하는 경우 dictionary=True 옵션 확인 필요
    cursor = db.cursor(dictionary=True) 
    try:
        sql = """
            SELECT 
                id, level, category, q_number, 
                question_text, passage as sub_text, 
                option_a, option_b, option_c, option_d, 
                correct_answer, points, audio_url
            FROM level_test_questions 
            WHERE level = %s AND branch_code = %s AND is_active = 1
            ORDER BY q_number ASC
        """
        cursor.execute(sql, (level, branch_code))
        questions = cursor.fetchall()

        if not questions:
            # 404 에러 시 프론트엔드에서 예외 처리하기 쉽도록 빈 배열 반환도 고려해볼 수 있습니다.
            return {"status": "success", "total_count": 0, "questions": []}

        return {
            "status": "success",
            "level": level,
            "total_count": len(questions),
            "questions": questions
        }
    except Exception as e:
        print(f"🔥 Questions Load Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

# --- [API 2] 시험 결과 제출 ---
@router.post("/submit")
async def submit_level_test(data: TestSubmitRequest, db = Depends(get_db)):
    cursor = db.cursor()
    try:
        # 실제 채점 로직이 필요하다면 여기서 total_score 계산 로직을 추가할 수 있습니다.
        total_score = 0.0 
        
        sql = """
            INSERT INTO level_test_results 
            (user_id, branch_code, level, answers_json, total_score, test_date)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """
        
        cursor.execute(sql, (
            data.temp_name, 
            data.branch_code, 
            data.level, 
            json.dumps(data.answers), 
            total_score
        ))
        
        db.commit()
        return {"status": "success", "message": "결과가 성공적으로 저장되었습니다."}
        
    except Exception as e:
        if db: db.rollback()
        print(f"🔥 Error saving test result: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()