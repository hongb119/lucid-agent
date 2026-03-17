from fastapi import APIRouter, HTTPException
from app.database import get_db_connection
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# --- 데이터 모델 (Pydantic) ---
class DictaLogEntry(BaseModel):
    study_item_no: int
    try_count: int
    taken_time: int
    is_hint_used: str = "N"

# inputArray 내부 요소의 타입을 명확히 정의하여 422 에러 방지
class InputItem(BaseModel):
    study_no: int
    study_item_no: int
    input_eng: str
    input_eng_pass: str

class SaveDictaRequest(BaseModel):
    task_id: int
    user_id: str
    re_study: str
    re_study_no: int
    inputArray: List[InputItem] # Dict 대신 정의된 모델 사용
    tracking_logs: Optional[List[DictaLogEntry]] = []
    total_time: Optional[int] = 0

# 1. Dictation 데이터 페칭 (Scramble + Quiz 통합)
@router.get("/fetch-dicta")
async def fetch_dicta_words(task_id: int, user_id: str, re_study: str):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        sql_task = """
            SELECT study_no, re_study_no, study_step2_name, study_step3_name, 
                   study_unit, study_part, study_type
            FROM splucid_task 
            WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(sql_task, (task_id, user_id))
        task_info = cursor.fetchone()

        if not task_info:
            return {"status": "fail", "message": "Task not found"}

        study_no = task_info['study_no']

        # Scramble용 문장 데이터
        sql_words = "SELECT * FROM splucid_study_voca WHERE study_no = %s ORDER BY study_item_no ASC"
        cursor.execute(sql_words, (study_no,))
        words = cursor.fetchall()

        # Quiz용 데이터
        sql_quiz = "SELECT * FROM splucid_study_quiz WHERE study_no = %s ORDER BY study_item_no ASC"
        cursor.execute(sql_quiz, (study_no,))
        quizzes = cursor.fetchall()

        return {
            "status": "success", 
            "task_info": task_info, 
            "words": words, 
            "quizzes": quizzes 
        }
    except Exception as e:
        return {"status": "fail", "message": str(e)}
    finally:
        if connection: connection.close()

# 2. 결과 저장 및 "상세 기록" 포함 반환 로직 (디버깅 완료)
@router.post("/save-tracking")
async def save_dicta_tracking(req: SaveDictaRequest):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # [1] 기존 상세 기록 삭제 (데이터 꼬임 방지)
        cursor.execute("DELETE FROM splucid_result_word WHERE task_id = %s AND study_user_id = %s", (req.task_id, req.user_id))
        cursor.execute("DELETE FROM splucid_study_rword_log WHERE task_id = %s AND user_id = %s", (req.task_id, req.user_id))

        # [2] 정답 여부 저장 (executemany로 성능 최적화)
        correct_count = 0
        res_word_data = []
        for item in req.inputArray:
            if item.input_eng_pass == 'Y': correct_count += 1
            res_word_data.append((
                req.task_id, item.study_no, item.study_item_no, req.re_study_no,
                req.user_id, item.input_eng, item.input_eng_pass, now_str
            ))
        
        if res_word_data:
            cursor.executemany("""
                INSERT INTO splucid_result_word (task_id, study_no, study_item_no, re_study_no, study_user_id, input_eng, input_eng_pass, input_save_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, res_word_data)

        # [3] 학습 로그 저장 (상세 트래킹)
        if req.tracking_logs:
            log_data = [(req.task_id, req.user_id, l.study_item_no, l.try_count, l.taken_time, l.is_hint_used) for l in req.tracking_logs]
            cursor.executemany("""
                INSERT INTO splucid_study_rword_log (task_id, user_id, study_item_no, try_count, taken_time, is_hint_used)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, log_data)

        # [4] 요약 리포트 저장 (Report 카드용)
        total = len(req.inputArray)
        # 천재 멘트 대응 로직 (백엔드에서 멘트 생성)
        if correct_count == total:
            ai_comment = "모든 QUIZ를 맞추었어요. 아무래도 학생은 영어 천재인가 봐요! 🧠✨"
        elif correct_count >= total * 0.8:
            ai_comment = "훌륭한 실력이에요! 문장 구조를 아주 잘 이해하고 있군요. 👍"
        else:
            ai_comment = "포기하지 않고 끝까지 해낸 점이 멋져요! 조금만 더 연습해볼까요? 💪"
        
        cursor.execute("""
            INSERT INTO splucid_study_rword_report (task_id, user_id, study_type, total_items, correct_items, total_time, ai_comment)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                correct_items=VALUES(correct_items), 
                total_time=VALUES(total_time), 
                ai_comment=VALUES(ai_comment), 
                reg_date=NOW()
        """, (req.task_id, req.user_id, 'Dictation', total, correct_count, req.total_time, ai_comment))

        # [5] 과제 완료 상태 업데이트
        cursor.execute("UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW() WHERE task_id = %s AND user_id = %s", (req.task_id, req.user_id))

        connection.commit()

        # [핵심 디버깅 포인트] 방금 저장한 상세 기록을 다시 조회해서 프론트에 전달
        # 그래야 "상세 학습 기록을 불러올 수 없습니다" 문구가 사라집니다.
        cursor.execute("""
            SELECT study_item_no, try_count, taken_time, is_hint_used 
            FROM splucid_study_rword_log 
            WHERE task_id = %s AND user_id = %s 
            ORDER BY study_item_no ASC
        """, (req.task_id, req.user_id))
        saved_logs = cursor.fetchall()

        print(f"✅ 저장 완료: {req.user_id} - 정답: {correct_count}/{total}")

        return {
            "result_code": "200", 
            "report": {
                "total": total, 
                "correct": correct_count, 
                "ai_comment": ai_comment
            },
            "tracking_logs": saved_logs,  # <-- 상세 기록 데이터 포함
            "total_time": req.total_time
        }

    except Exception as e:
        if connection: connection.rollback()
        print(f"❌ 저장 에러: {str(e)}")
        return {"result_code": "500", "message": str(e)}
    finally:
        if connection: connection.close()