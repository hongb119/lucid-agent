from fastapi import APIRouter, HTTPException
from app.database import get_db, get_db_connection
from typing import Optional, List
from pydantic import BaseModel
import json
from datetime import datetime

router = APIRouter()

class SaveResultRequest(BaseModel):
    task_id: int
    user_id: str
    re_study: str
    re_study_no: int
    inputArray: List[dict]

# 1. 단어 목록 로드 (일반/복습 분기)
@router.get("/fetch-words")
async def fetch_voca_words(task_id: int, user_id: str, re_study: str):
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
        re_study_no = task_info['re_study_no']

        if re_study == "R":
            # 복습 모드: 기존 오답('N') 위주 추출
            sql_words = """
                SELECT T2.* FROM splucid_result_word T1
                JOIN splucid_study_voca T2 ON T1.study_no = T2.study_no AND T1.study_item_no = T2.study_item_no
                WHERE T1.task_id = %s AND T1.study_user_id = %s AND T1.input_eng_pass = 'N' AND T1.re_study_no = %s
                ORDER BY T2.study_item_no ASC
            """
            cursor.execute(sql_words, (task_id, user_id, re_study_no))
            words = cursor.fetchall()
            if not words:
                cursor.execute("SELECT * FROM splucid_study_voca WHERE study_no = %s ORDER BY study_item_no ASC", (study_no,))
                words = cursor.fetchall()
        else:
            cursor.execute("SELECT * FROM splucid_study_voca WHERE study_no = %s ORDER BY study_item_no ASC", (study_no,))
            words = cursor.fetchall()

        return {"status": "success", "task_info": task_info, "words": words}
    finally:
        if connection: connection.close()

# 2. 퀴즈용 랜덤 오답 리스트
@router.post("/studyPVocaStepRandom")
async def get_random_words(data: dict):
    study_eng = data.get("study_eng")
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        sql = "SELECT * FROM splucid_study_voca WHERE study_eng <> %s ORDER BY RAND() LIMIT 3"
        cursor.execute(sql, (study_eng,))
        random_list = cursor.fetchall()
        return {"result_code": "200", "studyVocaRandomList": random_list}
    except Exception as e:
        return {"result_code": "500", "message": str(e)}
    finally:
        if connection: connection.close()

# 3. 결과 저장 및 AI 코멘트 생성
@router.post("/save-results")
async def save_voca_results(req: SaveResultRequest):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        # 상세 결과 초기화
        cursor.execute("DELETE FROM splucid_result_word WHERE task_id = %s AND study_user_id = %s AND re_study_no = %s", 
                       (req.task_id, req.user_id, req.re_study_no))

        sql_insert_detail = """
            INSERT INTO splucid_result_word (
                task_id, study_no, study_item_no, re_study_no, 
                study_user_id, input_eng, input_eng_pass, input_save_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        correct_count = 0
        wrong_words_list = []
        study_no = ""

        for item in req.inputArray:
            study_no = item.get('study_no', '')
            is_correct = (item.get('input_eng_pass') == 'Y' and item.get('input_kor_pass') == 'Y')
            final_pass = 'Y' if is_correct else 'N'
            
            if is_correct:
                correct_count += 1
            else:
                wrong_words_list.append(f"{item.get('study_eng')}:{item.get('study_kor')}")

            cursor.execute(sql_insert_detail, (
                req.task_id, study_no, item.get('study_item_no'), req.re_study_no, 
                req.user_id, item.get('study_eng'), final_pass, now_str
            ))

        total = len(req.inputArray)
        score = (correct_count / total) * 100 if total > 0 else 0
        ai_comment = "Perfect Score! 🏆" if score == 100 else "Good Job! 😊" if score >= 80 else "Keep it up! ❤️"

        # 성적표 저장 (DUPLICATE KEY 처리로 중복 방지)
        sql_report = """
            INSERT INTO splucid_study_word_report (
                task_id, user_id, study_no, study_type, total_items, correct_items, wrong_words, ai_comment
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                correct_items = VALUES(correct_items), wrong_words = VALUES(wrong_words), 
                ai_comment = VALUES(ai_comment), reg_date = NOW()
        """
        cursor.execute(sql_report, (
            req.task_id, req.user_id, study_no, 'Voca', 
            total, correct_count, ",".join(wrong_words_list), ai_comment
        ))

        # 과제 완료 처리
        cursor.execute("UPDATE splucid_task SET task_status = 'Y', task_end_date = NOW() WHERE task_id = %s", (req.task_id,))

        connection.commit()
        return {"result_code": "200", "report": {"total": total, "correct": correct_count, "ai_comment": ai_comment}}

    except Exception as e:
        if connection: connection.rollback()
        return {"result_code": "500", "message": str(e)}
    finally:
        if connection: connection.close()