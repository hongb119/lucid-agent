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
from datetime import datetime
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


# --- 데이터 모델 수정 (필드 누락 방지) ---
class SmallTalkLog(BaseModel):
    task_id: int
    user_id: str
    branch_code: Optional[str] = "MAIN"
    ai_no: int
    question_text: Optional[str] = ""  # 리액트에서 보낸 질문 텍스트 수신용 추가
    student_transcript: str
    result_status: str

class FinalCompleteRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: Optional[str] = "MAIN"
    re_study: str
    re_study_no: int
    logs: List[SmallTalkLog]

class SentenceResult(BaseModel):
    study_eng: str
    transcribed: str

class SummaryRequest(BaseModel):
    results: List[SentenceResult]
    

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
# 2. 음성 분석 (디렉토리 구조화 적용 버전)
@router.post("/analyze")
async def analyze_smalltalk(
    task_id: str = Form(...),        # 🚩 추가
    user_id: str = Form(...),        # 🚩 추가
    ai_no: str = Form(...),          # 🚩 추가 (몇 번째 대화인지)
    audio_file: UploadFile = File(...),
    correct_eng: Optional[str] = Form(""), 
    correct_except: Optional[str] = Form(""),
    db = Depends(get_db)
):
    try:
        # [1] 디렉토리 규칙 설정: uploads/smalltalk/taskID_userID
        folder_name = f"{task_id}_{user_id}"
        target_dir = UPLOAD_DIR / folder_name
        target_dir.mkdir(parents=True, exist_ok=True)

        # [2] 파일명 규칙 설정: aiNo_시간.webm (또는 wav)
        timestamp = datetime.now().strftime("%H%M%S")
        file_name = f"{ai_no}_{timestamp}.webm"
        save_path = target_dir / file_name

        # [3] 파일 물리적 저장
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)

        # [4] Whisper AI 분석 (숫자 스펠링 프롬프트 추가)
        with open(save_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio, 
                language="en",
                prompt="Please transcribe numbers as words, such as 'one', 'two', 'three' instead of '1', '2', '3'."
            )
        
        student_text = transcript.text.lower().strip()
        
        # [5] 정답 비교 로직 (기존 유지)
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

        print(f"✅ [SmallTalk 저장] {folder_name}/{file_name} : {student_text}")

        return {
            "status": "success",
            "transcribed": student_text, 
            "is_correct": is_correct,
            "file_path": str(save_path)
        }

    except Exception as e:
        print(f"🔥 SmallTalk Analyze Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# 3. TTS 서비스
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
    

@router.post("/complete")
async def complete_smalltalk(payload: FinalCompleteRequest, db = Depends(get_db)):
    """
    학습 완료 처리: 별점 갱신 + 종합 리포트 생성 + 상세 로그 저장
    """
    cursor = db.cursor(dictionary=True)
    now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        # [1] 단계: 해당 Task의 기본 정보 조회
        sql_info = "SELECT user_id, task_day, study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_info, (payload.task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            raise HTTPException(status_code=404, detail="해당 숙제를 찾을 수 없습니다.")

        user_id = task_info['user_id']
        task_day = task_info['task_day']
        study_no = task_info['study_no']

        # [2] 단계: 숙제 상태 업데이트
        sql_update_task = """
            UPDATE splucid_task 
            SET task_status = 'Y', task_end_date = %s, re_study_no = %s 
            WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(sql_update_task, (now_str, payload.re_study_no, payload.task_id, user_id))

        # [3] 단계: 별점 자동 계산 (기존 로직 유지)
        sql_all_day_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date, re_study_no 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_day_tasks, (user_id, task_day))
        all_day_tasks = cursor.fetchall()
        
        total_cnt = len(all_day_tasks)
        today_complete_cnt = 0
        re_study_1_cnt = 0
        re_study_2_cnt = 0
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                if str(t['task_day']) == str(t['end_date']): today_complete_cnt += 1
                if t['re_study_no'] >= 1: re_study_1_cnt += 1
                if t['re_study_no'] >= 2: re_study_2_cnt += 1

        star_cnt = 0
        memo = ""
        if total_cnt > 0:
            if total_cnt == today_complete_cnt:
                star_cnt, memo = 3, "모든 숙제 기간내 완료"
            elif (total_cnt == len([x for x in all_day_tasks if x['task_status'] == 'Y'])):
                star_cnt, memo = 2, "모든 숙제 완료"
            else:
                star_cnt, memo = 1, "숙제 일부 완료"
            
            if re_study_1_cnt == total_cnt: star_cnt += 1; memo += " + 복습 1회 완료"
            if re_study_2_cnt == total_cnt: star_cnt += 1; memo += " + 복습 2회 완료"

            cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (user_id, task_day))
            cursor.execute("INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) VALUES (%s, %s, %s, %s)", 
                           (user_id, task_day, star_cnt, memo))

        # [4] 단계: [추가] 종합 리포트 저장 (splucid_ai_small_talk_report)
        # 점수 및 요약은 프론트에서 계산해서 보낸다고 가정하거나 기본값 세팅
        correct_cnt = sum(1 for l in payload.logs if l.result_status == 'CORRECT')
        total_logs = len(payload.logs)
        accuracy = int((correct_cnt / total_logs * 100)) if total_logs > 0 else 0

        sql_report = """
            INSERT INTO splucid_ai_small_talk_report 
            (task_id, user_id, branch_code, study_no, total_score, accuracy_score, ai_summary_ko, reg_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_report, (
            payload.task_id, user_id, payload.branch_code, study_no, 
            accuracy, accuracy, "학습을 훌륭하게 마쳤습니다!", now_str
        ))

        # [5] 단계: 상세 로그 저장 (splucid_ai_small_talk_log)
        if payload.logs:
            sql_log_ins = """
                INSERT INTO splucid_ai_small_talk_log 
                (task_id, user_id, branch_code, study_no, ai_no, student_transcript, result_status, reg_date) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            for log in payload.logs:
                cursor.execute(sql_log_ins, (
                    payload.task_id, user_id, payload.branch_code, study_no,
                    log.ai_no, log.student_transcript, log.result_status, now_str
                ))

        db.commit()
        return {"result_code": "200", "star_cnt": star_cnt, "summary": memo}

    except Exception as e:
        db.rollback()
        print(f"🔥 Complete Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

@router.post("/generate-smalltalk-summary")
async def generate_smalltalk_summary(payload: SummaryRequest):
    try:
        # [1] 일문일답 데이터를 대화 로그 형식으로 재구성
        # payload.results에는 [{study_eng: '질문', transcribed: '답변'}, ...] 형태가 들어옵니다.
        full_conversation = ""
        for i, res in enumerate(payload.results, 1):
            if res.transcribed.strip():
                full_conversation += f"{i}번째 질문({res.study_eng})에 대한 학생의 대답: '{res.transcribed}'\n"

        if not full_conversation:
            return {"summary": "대화 내용이 확인되지 않아요. 마이크 설정을 확인하고 다시 이야기해볼까요?"}

        # [2] GPT 프롬프트: 일문일답의 '연결성'과 '태도' 분석
        prompt = (
            f"다음은 학생과 AI가 나눈 일문일답 영어 대화 기록입니다:\n\n{full_conversation}\n"
            "--- 분석 지침 ---\n"
            "1. 학생이 질문의 의도를 파악하고 적절한 대답을 했는지 전체적인 흐름을 봐줘.\n"
            "2. 단답형이라도 대답을 끝까지 마쳤다면 그 '시도' 자체를 크게 칭찬해줘.\n"
            "3. '맞다/틀리다'는 표현 대신 '자연스러운 소통', '자신감 있는 표현' 등의 단어를 사용해줘.\n"
            "4. 아이가 읽었을 때 기분이 좋아지도록 따뜻한 한국어로 3문장 정도 작성해줘. ✨\n"
            "5. 마지막에 '다음엔 이런 문장도 섞어봐!'라는 가벼운 제안을 하나 덧붙여줘."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a friendly and positive English conversation partner for kids."},
                {"role": "user", "content": prompt}
            ]
        )
        
        return {"summary": response.choices[0].message.content}

    except Exception as e:
        print(f"🔥 Summary Error: {e}")
        return {"summary": "오늘 루아이와 대화하느라 정말 고생 많았어요! 우리 다음엔 더 길게 이야기해봐요!"}