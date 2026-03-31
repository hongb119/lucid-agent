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
        
        # 1. 표준 날짜 포맷 생성
        now_full = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        today_date = datetime.now().strftime('%Y-%m-%d')
        
        # [단계 0] 해당 Task의 기본 정보(숙제 예정일) 조회
        sql_info = "SELECT task_day, study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_info, (req.task_id,))
        task_info = cursor.fetchone()
        if not task_info:
            return {"result_code": "404", "message": "Task not found"}
        
        task_day = task_info['task_day']
        study_no = task_info['study_no']

        # [1] 기존 상세 기록 삭제 (중복 방지)
        cursor.execute("DELETE FROM splucid_result_word WHERE task_id = %s AND study_user_id = %s", (req.task_id, req.user_id))
        cursor.execute("DELETE FROM splucid_study_rword_log WHERE task_id = %s AND user_id = %s", (req.task_id, req.user_id))

        # [2] 문항별 정답 여부 저장 (splucid_result_word)
        correct_count = 0
        res_word_data = []
        for item in req.inputArray:
            is_pass = 'Y' if item.input_eng_pass == 'Y' else 'N'
            if is_pass == 'Y': correct_count += 1
            res_word_data.append((
                req.task_id, item.study_no, item.study_item_no, req.re_study_no,
                req.user_id, item.input_eng, is_pass, now_full
            ))
        
        if res_word_data:
            cursor.executemany("""
                INSERT INTO splucid_result_word 
                (task_id, study_no, study_item_no, re_study_no, study_user_id, input_eng, input_eng_pass, input_save_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, res_word_data)

        # [3] 과제 마스터 테이블(splucid_task) 업데이트
        sql_task_finish = """
            UPDATE splucid_task 
            SET task_status = 'Y', 
                task_end_date = %s, 
                study_pass_tcnt = %s,
                re_study_no = %s
            WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(sql_task_finish, (now_full, correct_count, req.re_study_no, req.task_id, req.user_id))

        # [4] 별점(Star Point) 자동 계산 로직
        sql_all_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_tasks, (req.user_id, task_day))
        all_day_tasks = cursor.fetchall()
        
        total_day_cnt = len(all_day_tasks)
        today_complete_cnt = 0
        actual_all_done = 0
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                actual_all_done += 1
                # 숙제 예정일과 실제 완료일(YYYY-MM-DD) 비교
                if str(t['task_day']) == str(t['end_date']):
                    today_complete_cnt += 1

        star_cnt = 0
        star_memo = ""
        if total_day_cnt > 0:
            if total_day_cnt == today_complete_cnt:
                star_cnt = 3
                star_memo = "모든 숙제 기간내 완료"
            elif total_day_cnt == actual_all_done:
                star_cnt = 2
                star_memo = "모든 숙제 완료"
            elif actual_all_done > 0:
                star_cnt = 1
                star_memo = "일부 숙제 완료"

        # 별점 테이블 갱신 (기존 삭제 후 삽입)
        cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (req.user_id, task_day))
        if star_cnt > 0:
            sql_star_ins = "INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_star_ins, (req.user_id, task_day, star_cnt, star_memo))

        # [5] 상세 학습 로그 저장 (splucid_study_rword_log)
        if req.tracking_logs:
            log_data = [(req.task_id, req.user_id, l.study_item_no, l.try_count, l.taken_time, l.is_hint_used) for l in req.tracking_logs]
            cursor.executemany("""
                INSERT INTO splucid_study_rword_log 
                (task_id, user_id, study_item_no, try_count, taken_time, is_hint_used) 
                VALUES (%s, %s, %s, %s, %s, %s)
            """, log_data)

        connection.commit()

        # [6] ✨ 중요: 프론트엔드(DictaTotalFinish.jsx) 형식에 맞춘 반환
        return {
            "result_code": "200",
            "report": {
                "total": len(req.inputArray),
                "correct": correct_count,
                "score": int((correct_count / len(req.inputArray)) * 100) if len(req.inputArray) > 0 else 0
            },
            "tracking_logs": [
                {
                    "study_item_no": l.study_item_no,
                    "try_count": l.try_count,
                    "taken_time": l.taken_time
                } for l in req.tracking_logs
            ] if req.tracking_logs else [],
            "star_cnt": star_cnt
        }

    except Exception as e:
        if connection: connection.rollback()
        print(f"❌ 저장 에러 발생: {str(e)}")
        return {"result_code": "500", "message": str(e)}
    finally:
        if connection: connection.close()