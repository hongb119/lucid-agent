from fastapi import APIRouter, Body, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import json  # 파일 최상단으로 이동 (들여쓰기 오류 방지)
from datetime import datetime

from app.database import get_db, get_db_connection, db_config
from app.api.study_logic import get_unit_context, get_automatic_context
from app.api.ai_logic import (
    ask_agent_with_context, 
    analyze_image_text, 
    analyze_sentence_to_chunks,
    generate_personalized_greeting, 
    get_daily_recommended_word
)

router = APIRouter()

class WelcomeRequest(BaseModel):
    user_id: str
    task_id: Optional[str] = None  # int 대신 str로 변경 (안전성 확보)
    branch_code: Optional[str] = None
    re_study: Optional[str] = "N"
    re_study_no: Optional[int] = 0
    act: Optional[str] = None

# 1. 유닛 분석 데이터 조회
@router.get("/analyze/unit/{study_no}")
def get_unit_analysis(study_no: str):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM splucid_study_sentence WHERE TRIM(study_no) = %s", (study_no.strip(),))
        sentences = cursor.fetchall()
        
        if not sentences:
            return {"status": "fail", "message": "학습 데이터를 찾을 수 없습니다."}

        target_sentence = sentences[0]['study_eng']
        chunks_data = analyze_sentence_to_chunks(target_sentence)
        
        return {"status": "success", "data": {"unit": study_no, "chunks": chunks_data['chunks']}}
    except Exception as e:
        print(f"❌ Unit Analysis Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection: connection.close()

# 2. AI 질문 답변
@router.post("/ask")
async def ask_question(
    user_id: str = Body(None), 
    study_no: str = Body(None),
    question: str = Body(...)
):
    connection = None
    unit_context = None
    
    try:
        if study_no and str(study_no).strip():
            unit_context = get_unit_context(study_no)
        elif user_id and str(user_id).strip():
            unit_context = get_automatic_context(user_id)
    except Exception as context_e:
        print(f"⚠️ Context Fetch Failed: {context_e}")

    try:
        ai_answer = ask_agent_with_context(question, unit_context)

        if user_id and str(user_id).strip():
            try:
                connection = get_db_connection()
                cursor = connection.cursor()
                final_study_no = study_no if study_no else (unit_context['study_no'] if unit_context else None)
                
                log_sql = """
                    INSERT INTO splucid_ai_agent_log 
                    (user_id, study_no, question_type, student_query, ai_answer) 
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(log_sql, (user_id, final_study_no, 'CHAT', question, ai_answer))
                connection.commit()
            except Exception as db_e:
                print(f"⚠️ DB Save Error: {db_e}")
        
        return {"status": "success", "answer": ai_answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI 처리 오류")
    finally:
        if connection: connection.close()

# 3. OCR 이미지 분석
@router.post("/ocr")
async def process_ocr(image: str = Body(...), user_id: str = Body(None)):
    connection = None
    try:
        answer = analyze_image_text(image)
        if user_id and str(user_id).strip():
            connection = get_db_connection()
            cursor = connection.cursor()
            log_sql = """
                INSERT INTO splucid_ai_agent_log 
                (user_id, question_type, student_query, ai_answer) 
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(log_sql, (user_id, 'OCR', '[이미지 분석 요청]', answer))
            connection.commit()
        return {"status": "success", "answer": answer}
    except Exception as e:
        if connection: connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection: connection.close()
        

@router.post("/welcome-personalized")
async def get_welcome_personalized(req: WelcomeRequest):
    connection = None
    user_id = req.user_id
    
    # [개선] 초기 기본값 설정 (에러 대비)
    res_data = {
        "status": "success",
        "greeting": "안녕! 오늘도 즐겁게 공부해봐요!",
        "recommendation": None
    }

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # 1. 학생 실명 조회
        cursor.execute("SELECT user_name FROM splucid_user WHERE user_id = %s", (user_id,))
        user_res = cursor.fetchone()
        
        # [수정] "이세희 Molly" -> "이세희" (공백이 있으면 앞부분만 추출)
        raw_name = user_res['user_name'] if user_res else "친구"
        clean_name = raw_name.split(' ')[0] if raw_name else "친구"

        # 2. 최신 학습 정보 조회
        cursor.execute("""
            SELECT study_step2_name, task_status 
            FROM splucid_task 
            WHERE user_id = %s 
            ORDER BY task_day DESC, task_id DESC 
            LIMIT 1
        """, (user_id,))
        last_task = cursor.fetchone()

        user_context = {
            "name": clean_name,
            "book": last_task['study_step2_name'] if last_task else "루시드 영어",
            "status": last_task['task_status'] if last_task else 'Y'
        }

        # 3. 인사말 및 단어 생성 (요청하신 대로 간결하게 수정)
        # AI 생성 대신 직접 포맷팅하여 속도와 정확도 확보
        greeting = f"안녕, {clean_name}! 오늘도 화이팅!"
        
        # [주의] 인자 없이 호출하도록 수정됨
        recommendation = get_daily_recommended_word()

        # 4. 로그 저장 로직
        try:
            rec_json_str = json.dumps(recommendation, ensure_ascii=False) if recommendation else "{}"
            
            log_sql = """
                INSERT INTO splucid_ai_agent_log 
                (user_id, question_type, student_query, ai_answer, chunk_json) 
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(log_sql, (
                user_id, 
                'WORD', 
                f"Welcome for {user_context['book']}", 
                greeting, 
                rec_json_str
            ))
            connection.commit()
        except Exception as log_e:
            print(f"⚠️ Log Insert Error (Ignored): {log_e}")

        # 최종 데이터 반영
        res_data["greeting"] = greeting
        res_data["recommendation"] = recommendation
        return res_data

    except Exception as e:
        print(f"❌ Critical Error in welcome-personalized: {str(e)}")
        return res_data # 에러 시에도 기본 greeting이 담긴 res_data 반환
    finally:
        if connection:
            connection.close()