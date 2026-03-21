# C:\lucid-academy\backend\app\services\ai_service.py
import openai
import os
from app.database import get_db
from fastapi import APIRouter  # 1. 추가

# 2. 라우터 객체 생성 (이게 있어야 에러가 안 납니다)
router = APIRouter()

# 기존 함수들...
async def transcribe(file):
    return "This is a dummy transcript for testing."

def calculate_accuracy(transcript, original_text):
    t_words = transcript.lower().split()
    o_words = original_text.lower().split()
    return 95.5

def save_to_db(task_id, user_id, accuracy):
    db = get_db()
    if db:
        db.close()
    return True

# 3. (옵션) 나중에 API로 호출할 엔드포인트가 필요하다면 여기에 작성
@router.get("/status")
async def check_status():
    return {"status": "AI Service logic is ready"}