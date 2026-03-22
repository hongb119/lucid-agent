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
    # 기본값 설정 (GPT 장애 대비)
    summary_text = "오늘 학습도 수고 많았어요! 루아이와 함께 꾸준히 연습해봐요."
    
    try:
        # 1. 학습 정보(study_no) 안전하게 가져오기
        sql_get_study = "SELECT study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_get_study, (payload.task_id,))
        task_data = cursor.fetchone()
        
        if not task_data:
            print(f"⚠️ Task ID {payload.task_id} 를 찾을 수 없음")
            study_no = 0 
        else:
            study_no = task_data['study_no']

        # 2. ⭐ GPT 프롬프트 고도화 (팩트 기반 & 냉정한 분석)
        try:
            # logs에서 질문 내용과 학생 답변을 매칭하여 프롬프트 구성
            log_entries = []
            for l in payload.logs:
                # 리액트에서 보낸 question_text가 없으면 ai_no로 대체
                q_txt = getattr(l, 'question_text', f"Question {l.ai_no}")
                ans_txt = l.student_transcript if l.student_transcript else "응답 없음"
                log_entries.append(f"- {q_txt} -> 학생 답변: {ans_txt}")
            
            log_summary = "\n".join(log_entries)
            
            if log_summary:
                prompt = (
                    f"당신은 엄격하면서도 다정한 영어 선생님 '루아이'입니다.\n"
                    f"다음은 학생의 실제 스몰토크 답변 데이터입니다:\n{log_summary}\n\n"
                    "--- 평가 지침 ---\n"
                    "1. 학생이 답변을 하지 않았거나 질문과 전혀 상관없는 말을 했다면 반드시 지적하세요.\n"
                    "2. 무의미한 칭찬은 지양하고, 문법이나 단어가 어색했다면 한국어로 교정 제안을 포함하세요.\n"
                    "3. 전체 유창성을 0~100점 사이의 점수로 환산하여 첫 줄에 '점수: [점수]점' 형식으로 표시하세요.\n"
                    "4. 총평은 3문장 내외로, 실제 답변 내용을 언급하며 구체적으로 작성하세요."
                    "5. 특수문자 및 쌍따옴표등 기호는 아무것도 사용하지 말아요."
                )

                gpt_res = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a factual English tutor. Focus on accuracy and provide objective feedback."},
                        {"role": "user", "content": prompt}
                    ]
                )
                summary_text = gpt_res.choices[0].message.content
        except Exception as gpt_err:
            print(f"⚠️ GPT API 호출 실패: {gpt_err}")

        # 3. splucid_task 상태 업데이트
        if payload.re_study == "R":
            # 재학습인 경우 차수만 업데이트
            sql_task = "UPDATE splucid_task SET re_study_no = %s WHERE task_id = %s"
            cursor.execute(sql_task, (payload.re_study_no, payload.task_id))
        else:
            # 일반 완료인 경우 상태 'Y' 및 종료일 기록
            sql_task = "UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW() WHERE task_id = %s"
            cursor.execute(sql_task, (payload.task_id,))

        # 4. 리포트 테이블 저장 (지점 코드 포함)
        # payload.user_id와 summary_text(점수 포함)를 명확히 저장합니다.
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
        raise HTTPException(status_code=500, detail=f"저장 중 에러 발생: {str(e)}")
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