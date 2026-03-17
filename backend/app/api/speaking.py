import os
import uuid
import json
import io
import shutil
from typing import List, Optional
from pathlib import Path
import datetime
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
from app.database import get_db, get_db_connection

# [1] 환경 설정 로드
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# [2] OpenAI 클라이언트 초기화
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


router = APIRouter()

# --- [데이터 검증 모델] ---
class SentenceResult(BaseModel):
    study_eng: str
    transcribed: str

class SummaryRequest(BaseModel):
    results: List[SentenceResult]

class ReportDetail(BaseModel):
    study_eng: str
    transcribed: str

class ReportSaveRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: str
    accuracy: str
    wpm: int
    duration: str
    word_count: int
    score: int
    overall_feedback: str
    details: List[ReportDetail]

# --- [업로드 경로 설정] ---
UPLOAD_DIR = BASE_DIR / "uploads" / "speaking"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 1. [GET] 학습 정보 조회
@router.get("/info")
async def get_speaking_info(task_id: int, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        sql_task = "SELECT study_step2_name, study_step3_name, study_part, study_unit, study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_task, (task_id,))
        dayTaskView = cursor.fetchone()
        
        if not dayTaskView:
            raise HTTPException(status_code=404, detail="과제 정보를 찾을 수 없습니다.")

        sql_sentences = "SELECT study_eng, study_mp3_file, study_item_no FROM splucid_study_sentence WHERE study_no = %s ORDER BY study_item_no ASC"
        cursor.execute(sql_sentences, (dayTaskView['study_no'],))
        studySentenceList = cursor.fetchall()

        return {
            "dayTaskView": dayTaskView,
            "studySentenceList": studySentenceList
        }
    except Exception as e:
        print(f"❌ [DB Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="데이터베이스 조회 실패")
    finally:
        cursor.close()

# 2. [POST] AI 분석 (Whisper + GPT)
@router.post("/ai-analysis")
async def analyze_speaking_with_ai(
    user_code: str = Form(...),
    branch_code: str = Form(...),
    target_text: str = Form(...),
    audio_file: UploadFile = File(...),
):
    ext = audio_file.filename.split('.')[-1]
    file_name = f"{branch_code}_{user_code}_{uuid.uuid4()}.{ext}"
    save_path = UPLOAD_DIR / file_name

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    try:
        with open(save_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio, 
                language="en"
            )
        student_text = transcript.text

        prompt = (
            f"Compare Target: '{target_text}' and Student: '{student_text}'. "
            f"Provide JSON: {{'score': 0-100, 'feedback': 'string'}}"
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a supportive English teacher."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        return {
            "status": "success", 
            "transcribed": student_text, 
            "ai_feedback": json.loads(response.choices[0].message.content)
        }
    except Exception as e:
        print(f"❌ [AI Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="AI 분석 오류")
    
# [NEW] 2-1. 전체 통녹음 분석 (Whisper + GPT Batch)
@router.post("/ai-analysis-batch")
async def analyze_speaking_batch(
    user_code: str = Form(...),
    task_id: str = Form(...),
    branch_code: str = Form(...),
    target_sentences: str = Form(...),  # JSON 문자열: ["sentence1", "sentence2", ...]
    audio_file: UploadFile = File(...),
):
    # [1] 파일명 규칙: 아이디_숙제번호_일시
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = audio_file.filename.split('.')[-1]
    file_name = f"{user_code}_{task_id}_{now_str}.{ext}"
    save_path = UPLOAD_DIR / file_name

    # [2] 음성 파일 물리적 저장
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    try:
        # [3] Whisper로 전체 텍스트 추출
        with open(save_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", file=audio, language="en"
            )
        full_transcribed_text = transcript.text
        target_list = json.loads(target_sentences)

        # [4] GPT-4o-mini를 이용한 문장별 매칭 및 채점
        prompt = (
            f"Student's full speech: '{full_transcribed_text}'\n"
            f"Target sentences to match: {target_list}\n"
            "Compare the speech with target sentences. For each target sentence, "
            "provide: 1) original text, 2) matched student's text, 3) accuracy score(0-100), 4) short feedback.\n"
            "Return JSON format: {'results': [{'study_eng':'', 'transcribed':'', 'score':0, 'feedback':''}, ...]}"
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": "You are a professional English speech rater."},
                      {"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        
        analysis_data = json.loads(response.choices[0].message.content)

        return {
            "status": "success",
            "file_name": file_name, # 저장된 파일명 반환
            "full_text": full_transcribed_text,
            "analysis": analysis_data['results']
        }
    except Exception as e:
        print(f"❌ [Batch Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="Batch 분석 중 오류가 발생했습니다.")
    

# 3. [POST] 최종 리포트 및 결과 저장 (하드코딩 제거 버전)
@router.post("/save-report")
async def save_final_report(payload: ReportSaveRequest, db = Depends(get_db)):
    cursor = db.cursor()
    try:
        # [A] 메인 리포트 저장 (splucid_speaking_report)
        sql_report = """
            INSERT INTO splucid_speaking_report 
            (task_id, user_id, branch_code, accuracy_grade, total_score, total_words, wpm, duration, overall_feedback)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_report, (
            payload.task_id, payload.user_id, payload.branch_code,
            payload.accuracy, payload.score, payload.word_count,
            payload.wpm, payload.duration, payload.overall_feedback
        ))

        # [B] 문장별 상세 내역 저장 (splucid_speaking_detail)
        sql_detail = """
            INSERT INTO splucid_speaking_detail (task_id, study_eng, transcribed_text)
            VALUES (%s, %s, %s)
        """
        detail_data = [(payload.task_id, d.study_eng, d.transcribed) for d in payload.details]
        cursor.executemany(sql_detail, detail_data)

        # [C] 기본 과제 테이블 상태 업데이트
        sql_task_update = "UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW() WHERE task_id = %s"
        cursor.execute(sql_task_update, (payload.task_id,))

        db.commit()
        return {"result_code": "200", "result_msg": "리포트가 성공적으로 저장되었습니다."}
    except Exception as e:
        db.rollback()
        print(f"❌ [Save Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="리포트 저장 실패")
    finally:
        cursor.close()

# 4. [POST] 최종 총평 (GPT)
@router.post("/final-summary")
async def generate_final_summary(payload: SummaryRequest):
    try:
        summary_data = "\n".join([f"Target: {i.study_eng}, Student: {i.transcribed}" for i in payload.results])
        prompt = (
            f"다음은 학생의 스피킹 결과입니다:\n{summary_data}\n\n"
            "너는 루시드 학원의 다정한 AI 선생님이야. 한국어로 성과를 칭찬하고 구체적인 팁을 포함해 3문장 이내로 요약해줘."
        )
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail="총평 생성 실패")

# 5. [POST] TTS
@router.post("/tts")
async def text_to_speech(payload: dict = Body(...)):
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="shimmer", 
            input=payload.get("text")
        )
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail="TTS 생성 실패")

# 6. [GET] 스키마 조회 전용 (관리용)
@router.get("/schema/{table_name}")
async def get_table_schema(table_name: str, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        cursor.execute(f"DESCRIBE {table_name}")
        return {"table": table_name, "columns": cursor.fetchall()}
    except Exception as e:
        raise HTTPException(status_code=400, detail="존재하지 않는 테이블")
    finally:
        cursor.close()