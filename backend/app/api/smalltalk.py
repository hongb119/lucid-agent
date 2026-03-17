import os
import uuid
import json
import io
import shutil
from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
from dotenv import load_dotenv

# [1] 통합 DB 의존성
from app.database import get_db

# [2] 설정 로드
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

# [3] OpenAI 클라이언트
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

# --- 업로드 경로 ---
UPLOAD_DIR = BASE_DIR / "uploads" / "smalltalk"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# --- 데이터 모델 수정 (React에서 보내는 branch_code 추가) ---
class SmallTalkLog(BaseModel):
    task_id: int
    user_id: str
    branch_code: Optional[str] = "MAIN" # 필드 추가
    ai_no: int
    student_transcript: str
    result_status: str

class FinalCompleteRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: Optional[str] = "MAIN" # 필드 추가
    re_study: str
    re_study_no: int
    logs: List[SmallTalkLog]


# 1. 정보 조회
@router.get("/info")
async def get_smalltalk_info(task_id: int, user_id: str, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        sql_combined = """
            SELECT 
                t.study_no, t.study_step2_name, t.study_unit,
                u.user_name
            FROM splucid_task t
            LEFT JOIN splucid_user u ON t.user_id = u.user_id
            WHERE t.task_id = %s AND t.user_id = %s
        """
        cursor.execute(sql_combined, (task_id, user_id))
        task_info = cursor.fetchone()
        
        if not task_info:
            sql_task_only = "SELECT study_no, study_step2_name, study_unit FROM splucid_task WHERE task_id = %s"
            cursor.execute(sql_task_only, (task_id,))
            task_info = cursor.fetchone()
            if task_info:
                task_info['user_name'] = user_id
            else:
                raise HTTPException(status_code=404, detail="Task not found")

        sql_content = "SELECT * FROM splucid_ai_small_talk WHERE study_no = %s ORDER BY ai_no ASC"
        cursor.execute(sql_content, (task_info['study_no'],))
        content_list = cursor.fetchall()

        return {
            "task_info": task_info, 
            "content_list": content_list
        }
    except Exception as e:
        print(f"🔥 Info Load Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

# 2. 음성 분석
@router.post("/analyze")
async def analyze_smalltalk(
    audio_file: UploadFile = File(...),
    correct_eng: Optional[str] = Form(""), 
    correct_except: Optional[str] = Form(""),
    db = Depends(get_db)
):
    temp_filename = f"{uuid.uuid4()}.wav"
    temp_path = UPLOAD_DIR / temp_filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail="파일 저장 실패")

    try:
        with open(temp_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio, 
                language="en"
            )
        
        student_text = transcript.text.lower().strip()
        is_correct = False
        target_main = correct_eng.lower().strip() if correct_eng else ""
        
        if target_main and target_main in student_text:
            is_correct = True
        elif correct_except:
            except_list = [word.strip().lower() for word in correct_except.split('|')]
            for word in except_list:
                if word and word in student_text:
                    is_correct = True
                    break

        return {
            "status": "success",
            "transcribed": student_text, 
            "is_correct": is_correct
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_path.exists():
            temp_path.unlink()

# 3. 최종 저장 및 리포트 생성 (가장 중요한 부분)
@router.post("/complete")
async def complete_smalltalk(payload: FinalCompleteRequest, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    summary_text = "오늘 학습도 수고 많았어요! 루아이와 함께 꾸준히 연습해봐요."
    
    try:
        # study_no 안전하게 가져오기
        sql_get_study = "SELECT study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_get_study, (payload.task_id,))
        task_data = cursor.fetchone()
        
        # task_data가 없는 경우 예외 처리
        if not task_data:
            print(f"⚠️ Task ID {payload.task_id} 를 찾을 수 없음")
            study_no = 0 
        else:
            study_no = task_data['study_no']

        # 1. AI 요약 리포트 생성
        try:
            # 로그에서 텍스트만 추출 ( student_transcript가 없을 경우 대비 )
            log_texts = [f"Q{l.ai_no}: {l.student_transcript}" for l in payload.logs if l.student_transcript]
            log_summary = "\n".join(log_texts)
            
            if log_summary:
                gpt_res = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{
                        "role": "user", 
                        "content": f"학생의 영어 대화 결과야:\n{log_summary}\n다정한 AI 선생님처럼 한국어 총평 3문장 작성해줘."
                    }]
                )
                summary_text = gpt_res.choices[0].message.content
        except Exception as gpt_err:
            print(f"⚠️ GPT API 호출 실패: {gpt_err}")

        # 2. splucid_task 업데이트
        if payload.re_study == "R":
            sql_task = "UPDATE splucid_task SET re_study_no = %s WHERE task_id = %s"
            cursor.execute(sql_task, (payload.re_study_no, payload.task_id))
        else:
            sql_task = "UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW() WHERE task_id = %s"
            cursor.execute(sql_task, (payload.task_id,))

        # 3. 리포트 테이블 저장
        sql_report = """
            INSERT INTO splucid_ai_small_talk_report 
            (task_id, study_no, user_id, ai_summary_ko, reg_date) 
            VALUES (%s, %s, %s, %s, NOW())
        """
        cursor.execute(sql_report, (payload.task_id, study_no, payload.user_id, summary_text))

        db.commit()
        return {"result_code": "200", "summary": summary_text}
        
    except Exception as e:
        db.rollback()
        print(f"🔥 Final Save Error: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"저장 중 서버 에러 발생: {str(e)}")
    finally:
        cursor.close()

# 4. TTS 서비스
@router.post("/tts")
async def smalltalk_tts(payload: dict = Body(...)):
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="텍스트 누락")
    try:
        response = client.audio.speech.create(
            model="tts-1", voice="nova", input=text
        )
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))