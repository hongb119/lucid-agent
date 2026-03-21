import os
import json
import uuid
import shutil
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from pydantic import BaseModel
import openai
from dotenv import load_dotenv

# [1] 통합 DB 의존성
from app.database import get_db

# [2] 경로 및 환경 설정 (하드코딩 제거)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
router = APIRouter()

# 오디오 저장 경로
UPLOAD_DIR = BASE_DIR / "uploads" / "patterndrill"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# --- 데이터 모델 (지점코드/사용자ID 포함) ---
class DrillLog(BaseModel):
    study_item_no: int
    student_transcript: Optional[str] = ""
    unscramble_input: Optional[str] = ""
    is_speaking_correct: bool
    is_unscramble_correct: bool

class DrillCompleteRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: str # 지점코드 필수
    re_study: str
    re_study_no: int
    logs: List[DrillLog]

# 1. 학습 정보 조회
@router.get("/info")
async def get_drill_info(task_id: int, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        sql_task = "SELECT study_no, study_step2_name, study_unit FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_task, (task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            raise HTTPException(status_code=404, detail="Task not found")

        sql_content = "SELECT * FROM splucid_study_sentence WHERE study_no = %s ORDER BY study_item_no ASC"
        cursor.execute(sql_content, (task_info['study_no'],))
        content_list = cursor.fetchall()

        return {"task_info": task_info, "content_list": content_list}
    finally:
        cursor.close()

# 2. 실시간 발음 분석
@router.post("/analyze-speaking")
async def analyze_speaking(target_text: str = Form(...), audio_file: UploadFile = File(...)):
    file_name = f"drill_{uuid.uuid4()}.wav"
    save_path = UPLOAD_DIR / file_name

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        with open(save_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", file=audio, language="en"
            )
        
        student_text = transcript.text.lower().strip()
        # 정규식 대신 핵심 단어 포함 여부로 판정 (배포 시 정밀화 가능)
        is_correct = target_text.lower().replace(".", "").strip() in student_text

        return {"transcribed": student_text, "is_correct": is_correct}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if save_path.exists(): save_path.unlink()

# 3. 언스크램블 정답 검증
@router.post("/check-unscramble")
async def check_unscramble(study_item_no: int = Form(...), input_text: str = Form(...)):
    try:
        # 데이터베이스에서 정답 문장 조회
        cursor = get_db().cursor(dictionary=True)
        sql = "SELECT study_eng, study_unscramble FROM splucid_study_sentence WHERE study_item_no = %s"
        cursor.execute(sql, (study_item_no,))
        result = cursor.fetchone()
        cursor.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Study item not found")
        
        # 언스크램블용 문장이 있으면 사용, 없으면 원본 문장 사용
        target_text = result['study_unscramble'] or result['study_eng']
        
        # 정규화 함수: 대소문자, 문장부호, 공백 정리
        def normalize_text(text):
            import re
            # 소문자 변환, 문장부호 제거, 연속된 공백을 단일 공백으로, 양쪽 공백 제거
            return re.sub(r'[^\w\s]', '', text.lower()).strip()
        
        normalized_input = normalize_text(input_text)
        normalized_target = normalize_text(target_text)
        
        is_correct = normalized_input == normalized_target
        
        return {
            "is_correct": is_correct,
            "input_normalized": normalized_input,
            "target_normalized": normalized_target,
            "target_original": target_text
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. 최종 저장 (지점코드 연동)
@router.post("/complete")
async def complete_drill(payload: DrillCompleteRequest, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        # 점수 계산
        total = len(payload.logs)
        spk_score = int((sum(1 for l in payload.logs if l.is_speaking_correct) / total) * 100) if total > 0 else 0
        uns_score = int((sum(1 for l in payload.logs if l.is_unscramble_correct) / total) * 100) if total > 0 else 0

        # AI 요약
        gpt_res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"발음 {spk_score}점, 어순 {uns_score}점인 학생에게 다정한 격려 2문장."}]
        )
        summary = gpt_res.choices[0].message.content

        # 리포트 저장
        sql_report = """
            INSERT INTO splucid_ai_pattern_drill_report 
            (task_id, study_no, user_id, branch_code, speaking_score, unscramble_score, ai_summary_ko, detail_logs, reg_date)
            SELECT %s, study_no, %s, %s, %s, %s, %s, %s, NOW()
            FROM splucid_task WHERE task_id = %s
        """
        logs_json = json.dumps([l.model_dump() for l in payload.logs], ensure_ascii=False)
        cursor.execute(sql_report, (payload.task_id, payload.user_id, payload.branch_code, spk_score, uns_score, summary, logs_json, payload.task_id))

        # 과제 완료 업데이트
        sql_update = "UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW(), re_study_no = %s WHERE task_id = %s"
        cursor.execute(sql_update, (payload.re_study_no, payload.task_id))

        db.commit()
        return {"result_code": "200", "summary": summary}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()