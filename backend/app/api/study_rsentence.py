from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- 데이터 요청 모델 ---
class RSentenceLog(BaseModel):
    study_item_no: int
    try_count: int
    taken_time: int
    input_text: str
    is_correct: str
    is_hint_used: str = 'N'

class SaveRSentenceRequest(BaseModel):
    task_id: int
    user_id: str
    re_study: str
    re_study_no: int
    tracking_logs: List[RSentenceLog]
    total_time: int

# 1. 학습 데이터 조회
@router.get("/fetch")
async def fetch_rsentence(task_id: int):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM splucid_task WHERE task_id = %s", (task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            return {"status": "fail", "message": "Task not found"}

        sql_sentence = """
            SELECT * FROM splucid_study_sentence 
            WHERE study_no = %s 
            ORDER BY study_item_no ASC
        """
        cursor.execute(sql_sentence, (task_info['study_no'],))
        sentences = cursor.fetchall()
        
        return {"status": "success", "task_info": task_info, "sentences": sentences}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection: connection.close()

# 2. 결과 저장 (보여주신 log_id, created_at 구조 반영)
@router.post("/save")
async def save_rsentence(req: SaveRSentenceRequest):
    print(f"--- 📊 RSentence 저장 시작: {req.user_id} ---")
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # [A] 기존 로그 삭제 (현재 테이블명 확인 완료)
        cursor.execute("""
            DELETE FROM splucid_study_rsentence_log 
            WHERE task_id = %s AND user_id = %s
        """, (req.task_id, req.user_id))

        # [B] 상세 로그 저장 (created_at은 DB DEFAULT 처리되므로 제외)
        sql_log = """
            INSERT INTO splucid_study_rsentence_log 
            (task_id, user_id, study_item_no, try_count, taken_time, is_hint_used, input_text, is_correct)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        correct_count = 0
        log_data = []
        for log in req.tracking_logs:
            if log.is_correct == 'Y':
                correct_count += 1
            log_data.append((
                req.task_id, req.user_id, log.study_item_no, 
                log.try_count, log.taken_time, log.is_hint_used, log.input_text, log.is_correct
            ))
        
        if log_data:
            cursor.executemany(sql_log, log_data)

        # [C] 요약 리포트 저장 (report_id 자리에 자동생성되도록 컬럼 명시)
        total_items = len(req.tracking_logs)
        ai_comment = "모든 문장을 맞췄어요! 진짜 영어 천재인가 봐요! 🧠✨" if correct_count == total_items else "정말 고생 많았어요! 틀린 문장은 다시 한번 복습해봐요! 💪"
        
        sql_report = """
            INSERT INTO splucid_study_rsentence_report 
            (task_id, user_id, study_type, total_items, correct_items, total_time, ai_comment)
            VALUES (%s, %s, 'RSentence', %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                total_items = VALUES(total_items),
                correct_items = VALUES(correct_items), 
                total_time = VALUES(total_time), 
                ai_comment = VALUES(ai_comment)
        """
        cursor.execute(sql_report, (req.task_id, req.user_id, total_items, correct_count, req.total_time, ai_comment))

        # [D] Task 상태 업데이트
        cursor.execute("""
            UPDATE splucid_task 
            SET task_status = 'Y', task_end_date = NOW(), re_study_no = %s,
                study_total_cnt = %s, study_pass_tcnt = %s
            WHERE task_id = %s AND user_id = %s
        """, (req.re_study_no, total_items, correct_count, req.task_id, req.user_id))

        connection.commit()

        # [E] 결과 화면용 상세 Join 데이터 조회
        sql_final = """
            SELECT 
                L.study_item_no, L.try_count, L.taken_time, L.input_text, L.is_correct,
                S.study_eng AS origin_eng, S.study_kor AS origin_kor, S.study_mp3_file
            FROM splucid_study_rsentence_log L
            JOIN splucid_study_sentence S ON L.study_item_no = S.study_item_no 
            WHERE L.task_id = %s AND L.user_id = %s 
            AND S.study_no = (SELECT study_no FROM splucid_task WHERE task_id = %s LIMIT 1)
            ORDER BY L.study_item_no ASC
        """
        cursor.execute(sql_final, (req.task_id, req.user_id, req.task_id))
        final_logs = cursor.fetchall()

        return {
            "result_code": "200", 
            "report": {
                "total_items": total_items, 
                "correct_items": correct_count, 
                "ai_comment": ai_comment,
                "total_time": req.total_time
            },
            "tracking_logs": final_logs
        }

    except Exception as e:
        if connection: connection.rollback()
        print(f"❌ [SAVE ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if connection: connection.close()