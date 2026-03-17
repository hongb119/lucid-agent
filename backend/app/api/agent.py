from fastapi import APIRouter, Body, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.database import get_db, get_db_connection,db_config
from app.api.study_logic import get_unit_context, get_automatic_context
from app.api.ai_logic import (
    ask_agent_with_context, 
    analyze_image_text, 
    analyze_sentence_to_chunks,
    generate_personalized_greeting, 
    get_daily_recommended_word
)

router = APIRouter()

# --- 422 에러 방지 및 파라미터 수신을 위한 모델 정의 ---
class WelcomeRequest(BaseModel):
    user_id: str
    task_id: Optional[int] = None
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection: connection.close()

# 2. AI 질문 답변 (로그인 사용자만 저장 - 원본 로직 유지)
@router.post("/ask")
async def ask_question(
    user_id: str = Body(None), 
    study_no: str = Body(None),
    question: str = Body(...)
):
    connection = None
    unit_context = None
    
    # [방어막 1] 문맥 파악 단계 에러가 전체 로직을 죽이지 않도록 처리
    try:
        if study_no and str(study_no).strip():
            unit_context = get_unit_context(study_no)
        elif user_id and str(user_id).strip():
            unit_context = get_automatic_context(user_id)
    except Exception as context_e:
        print(f"⚠️ Context Fetch Failed (Ignoring): {context_e}")

    try:
        # AI 답변 생성
        ai_answer = ask_agent_with_context(question, unit_context)

        # [방어막 2] 사용자 코드가 있을 때만 저장 진행
        if user_id and str(user_id).strip():
            try:
                connection = get_db_connection()
                cursor = connection.cursor()
                
                # 최종 study_no 결정
                final_study_no = study_no if study_no else (unit_context['study_no'] if unit_context else None)
                
                log_sql = """
                    INSERT INTO splucid_ai_agent_log 
                    (user_id, study_no, question_type, student_query, ai_answer) 
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(log_sql, (user_id, final_study_no, 'CHAT', question, ai_answer))
                connection.commit()
                print(f"✅ User({user_id}) 대화 로그 저장 완료")
            except Exception as db_e:
                print(f"⚠️ DB Save Error: {db_e}")
                if connection: connection.rollback()
        
        return {"status": "success", "answer": ai_answer}

    except Exception as e:
        print(f"❌ Critical Error: {str(e)}")
        raise HTTPException(status_code=500, detail="AI 처리 중 오류가 발생했습니다.")
    finally:
        # PoolError 방지를 위한 안전한 닫기
        if connection:
            try: connection.close()
            except: pass

# 3. OCR 이미지 분석 (로깅 포함 원본 유지)
@router.post("/ocr")
async def process_ocr(image: str = Body(...), user_id: str = Body(None)):
    connection = None
    try:
        answer = analyze_image_text(image)
        if user_id and str(user_id).strip():
            connection = get_db_connection()
            cursor = connection.cursor()
            log_sql = "INSERT INTO splucid_ai_agent_log (user_id, question_type, student_query, ai_answer) VALUES (%s, %s, %s, %s)"
            cursor.execute(log_sql, (user_id, 'OCR', '[이미지 분석 요청]', answer))
            connection.commit()
        return {"status": "success", "answer": answer}
    except Exception as e:
        if connection: connection.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection:
            try: connection.close()
            except: pass

# 4. 학생 맞춤형 환영 인사말 조회 (기존 Body 방식 유지)
@router.post("/welcome-message")
async def get_welcome_message(user_id: str = Body(...)):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        sql = """
            SELECT study_step2_name, study_name, study_fail_tcnt, task_status
            FROM splucid_task
            WHERE user_id = %s
            ORDER BY task_save_date DESC
            LIMIT 1
        """
        cursor.execute(sql, (user_id,))
        last_task = cursor.fetchone()

        if last_task:
            context = {
                "book": last_task['study_step2_name'],
                "unit": last_task['study_name'],
                "fails": last_task['study_fail_tcnt'],
                "status": last_task['task_status']
            }
            greeting = generate_personalized_greeting(context)
        else:
            greeting = "반가워! 오늘부터 나랑 같이 즐겁게 영어 공부 시작해볼까? 😊"

        return {"status": "success", "message": greeting}
    except Exception as e:
        return {"status": "fail", "message": "오늘도 화이팅! 공부하다 궁금한 건 물어봐. ✨"}
    finally:
        if connection: connection.close()

# 5. 개인화 인사말 + 오늘의 추천 단어 통합 (Pydantic 모델 적용으로 422 에러 해결)
@router.post("/welcome-personalized")
async def get_welcome_personalized(req: WelcomeRequest):
    connection = None
    user_id = req.user_id
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # 💡 [핵심] 학생 실명 조회 (테이블명 user_name 컬럼 확인 필요)
        cursor.execute("SELECT user_name FROM splucid_user WHERE user_id = %s", (user_id,))
        user_res = cursor.fetchone()
        real_name = user_res['user_name'] if user_res else "친구"

        # 최근 태스크 조회
        cursor.execute("""
            SELECT study_step2_name, task_status FROM splucid_task 
            WHERE user_id = %s ORDER BY task_save_date DESC LIMIT 1
        """, (user_id,))
        last_task = cursor.fetchone()

        user_context = {
            "name": real_name,
            "book": last_task['study_step2_name'] if last_task else "루시드 영어",
            "status": last_task['task_status'] if last_task else 'Y'
        }

        # AI 인사말 및 단어 생성
        greeting = generate_personalized_greeting(user_context)
        recommendation = get_daily_recommended_word(user_context)

        return {
            "status": "success",
            "greeting": greeting,
            "recommendation": recommendation
        }
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"status": "fail", "greeting": "안녕! 오늘도 같이 즐겁게 공부하자! 😊"}
    finally:
        if connection: connection.close()