from fastapi import APIRouter, HTTPException
from app.database import get_db, get_db_connection
from typing import Optional, List
from pydantic import BaseModel
import json
from datetime import datetime

router = APIRouter()

# 프론트엔드 요청 데이터 구조
class SaveResultRequest(BaseModel):
    task_id: int
    user_id: str
    re_study: str
    re_study_no: int
    inputArray: List[dict] # 가장 안전한 dict 리스트 형태

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
# 3. 결과 저장 및 별점 자동 처리 (PHP 레거시 완벽 호환)
@router.post("/save-results")
async def save_voca_results(req: SaveResultRequest):
    connection = None
    try:
        print(f"🚀 [SAVE START] Task ID: {req.task_id}, User ID: {req.user_id}")
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        if not req.inputArray:
            return {"result_code": "400", "message": "No input data"}

        # 1. 날짜 및 기초 정보 설정
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        correct_count = 0
        total = len(req.inputArray)

        # [단계 0] 해당 Task의 숙제 날짜(task_day) 조회
        cursor.execute("SELECT task_day FROM splucid_task WHERE task_id = %s", (req.task_id,))
        task_info = cursor.fetchone()
        if not task_info:
            return {"result_code": "404", "message": "Task not found"}
        
        task_day = task_info['task_day']

        # 2. 상세 결과 삭제 (동일 회차 중복 방지)
        cursor.execute("""
            DELETE FROM splucid_result_word 
            WHERE task_id = %s AND study_user_id = %s AND re_study_no = %s
        """, (req.task_id, req.user_id, req.re_study_no))

        # 3. 상세 결과 인서트
        for item in req.inputArray:
            is_pass = item.get('input_eng_pass', 'N')
            if is_pass == 'Y':
                correct_count += 1
            
            cursor.execute("""
                INSERT INTO splucid_result_word (
                    task_id, study_no, study_item_no, re_study_no, 
                    study_user_id, input_eng, input_eng_pass, input_save_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                req.task_id, item.get('study_no'), item.get('study_item_no'), 
                req.re_study_no, req.user_id, item.get('study_eng', ''), 
                is_pass, now_str
            ))

        # 4. 성적 및 숙제 마스터 업데이트 (리스트 학습일자 연동)
        score = int((correct_count / total) * 100) if total > 0 else 0
        
        sql_task_update = """
            UPDATE splucid_task 
            SET task_status = 'Y', 
                task_end_date = %s, 
                task_score = %s,
                study_pass_tcnt = %s,
                re_study_no = %s
            WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(sql_task_update, (
            now_str, score, correct_count, req.re_study_no, req.task_id, req.user_id
        ))

        # 5. [핵심] PHP 별점(Star Point) 자동 계산 로직 (SetStarPointSave 이식)
        # 5-1. 당일 유저 숙제 전체 현황 조회
        sql_all_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date, re_study_no 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_tasks, (req.user_id, task_day))
        all_day_tasks = cursor.fetchall()
        
        total_day_cnt = len(all_day_tasks)
        today_complete_cnt = 0
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                # PHP 로직: 숙제예정일과 실제완료날짜가 같으면 '기간내 완료'
                if str(t['task_day']) == str(t['end_date']):
                    today_complete_cnt += 1

        # 5-2. 별점 점수 산정
        star_cnt = 0
        memo = ""
        if total_day_cnt > 0:
            if total_day_cnt == today_complete_cnt:
                star_cnt = 3
                memo = "모든 숙제 기간내 완료"
            elif today_complete_cnt > 0 or (total_day_cnt == len([x for x in all_day_tasks if x['task_status'] == 'Y'])):
                star_cnt = 2
                memo = "모든 숙제 완료"
            else:
                star_cnt = 1
                memo = "일부 숙제 완료"

            # 5-3. 별점 테이블 갱신 (DELETE 후 INSERT)
            cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (req.user_id, task_day))
            sql_star_ins = "INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_star_ins, (req.user_id, task_day, star_cnt, memo))

        # 6. 리포트 테이블 업데이트
        cursor.execute("""
            INSERT INTO splucid_study_word_report (
                task_id, user_id, study_no, study_type, total_items, correct_items, reg_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                correct_items = VALUES(correct_items), 
                reg_date = VALUES(reg_date)
        """, (req.task_id, req.user_id, req.inputArray[0].get('study_no'), 'Voca', total, correct_count, now_str))

        connection.commit()
        return {"result_code": "200", "report": {"total": total, "correct": correct_count, "score": score}}

    except Exception as e:
        if connection: connection.rollback()
        print(f"❌ [DATABASE ERROR] : {str(e)}")
        return {"result_code": "500", "message": str(e)}
    finally:
        if connection: connection.close()