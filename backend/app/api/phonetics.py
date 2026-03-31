from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path
from app.database import get_db_connection

# [1] 환경 설정 로드
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

router = APIRouter()

# --- [데이터 검증 모델] ---
class PhoneticsRandomRequest(BaseModel):
    study_step1_code: str
    study_step2_code: str
    study_no: int
    study_eng: str
    study_word: str

class PhoneticsSaveRequest(BaseModel):
    inputArray: list
    task_id: int
    user_id: str
    re_study: str = 'N'
    re_study_no: int = 0

def execute_query(query, params=None):
    connection = get_db_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        return result
    except Error as e:
        print(f"Query execution error: {e}")
        return None
    finally:
        cursor.close()
        connection.close()

def execute_update(query, params=None):
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        cursor.execute(query, params)
        connection.commit()
        return True
    except Error as e:
        print(f"Update execution error: {e}")
        connection.rollback()
        return False
    finally:
        cursor.close()
        connection.close()

@router.get('/fetch')
async def fetch_phonetics(
    task_id: int,
    user_id: str,
    re_study: str = 'N'
):
    """Phonetics 학습 데이터 가져오기"""
    try:
        if not task_id or not user_id:
            raise HTTPException(status_code=400, detail='Missing required parameters')
        
        # Task 정보 가져오기
        task_query = """
        SELECT T1.*, T2.user_name
        FROM splucid_task T1
        JOIN splucid_user T2 ON T1.user_id = T2.user_id
        WHERE T1.task_id = %s AND T1.user_id = %s
        """
        task_info = execute_query(task_query, (task_id, user_id))
        
        if not task_info:
            raise HTTPException(status_code=404, detail='Task not found')
        
        task_info = task_info[0]
        
        # Phonetics 데이터 가져오기
        phonetics_query = """
        SELECT 
            T1.*,
            '-' as input_word,
            '-' as input_word_pass,
            '-' as input_eng,
            '-' as input_eng_pass,
            T2.study_distractor,
            T2.study_answer,
            T3.study_step1_code,
            T3.study_step2_code
        FROM splucid_study_phonetics T1
        JOIN splucid_study_phonetics_quiz T2 ON T1.study_no = T2.study_no AND T1.study_item_no = T2.study_item_no
        JOIN splucid_study T3 ON T1.study_no = T3.study_no
        WHERE T1.study_no = %s
        ORDER BY T1.study_item_no ASC
        """
        
        phonetics_list = execute_query(phonetics_query, (task_info['study_no'],))
        
        if not phonetics_list:
            phonetics_list = []
        
        return {
            'result_code': '200',
            'message': 'Success',
            'task_info': task_info,
            'phonetics_list': phonetics_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')

@router.post('/random')
async def get_phonetics_random(request_data: PhoneticsRandomRequest):
    """Phonetics 퀴즈용 랜덤 데이터 가져오기"""
    try:
        study_step1_code = request_data.study_step1_code
        study_step2_code = request_data.study_step2_code
        study_no = request_data.study_no
        study_eng = request_data.study_eng
        study_word = request_data.study_word
        
        if not all([study_step1_code, study_step2_code, study_no, study_eng, study_word]):
            raise HTTPException(status_code=400, detail='Missing required parameters')
        
        # 음가 랜덤 리스트
        eng_query = """
        SELECT T2.*
        FROM splucid_study T1
        JOIN splucid_study_phonetics T2 ON T1.study_no = T2.study_no
        WHERE T1.study_step1_code = %s 
        AND T1.study_step2_code = %s 
        AND T1.study_no = %s 
        AND T2.study_eng != %s
        ORDER BY RAND()
        LIMIT 3
        """
        eng_random_list = execute_query(eng_query, (study_step1_code, study_step2_code, study_no, study_eng))
        
        # 단어 랜덤 리스트
        word_query = """
        SELECT T2.*
        FROM splucid_study T1
        JOIN splucid_study_phonetics T2 ON T1.study_no = T2.study_no
        WHERE T1.study_step1_code = %s 
        AND T1.study_step2_code = %s 
        AND T1.study_no = %s 
        AND T2.study_word != %s
        ORDER BY RAND()
        LIMIT 3
        """
        word_random_list = execute_query(word_query, (study_step1_code, study_step2_code, study_no, study_word))
        
        return {
            'result_code': '200',
            'message': 'Success',
            'studyPhoneticsRandomList': eng_random_list or [],
            'studyPhoneticsRandomWordList': word_random_list or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')


@router.post('/save')
async def save_phonetics_results(request_data: PhoneticsSaveRequest):
    """Phonetics 학습 결과 저장 및 PHP 달력 별점 연동"""
    try:
        input_array = request_data.inputArray
        task_id = request_data.task_id
        user_id = request_data.user_id
        re_study_no = request_data.re_study_no
        
        if not input_array or not task_id or not user_id:
            raise HTTPException(status_code=400, detail='Missing required parameters')
        
        # 1. 데이터 베이스 연결
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # [단계 1] 기본 정보 및 날짜 조회
        sql_info = "SELECT task_day FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_info, (task_id,))
        task_info = cursor.fetchone()
        if not task_info:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task_day = task_info['task_day']

        # [단계 2] Task 마스터 정보 업데이트
        pass_count = sum(1 for item in input_array if item.get('input_eng_pass') == 'Y')
        total_count = len(input_array)
        
        task_update_query = """
        UPDATE splucid_task 
        SET task_status = 'Y', 
            task_end_date = %s,
            study_pass_tcnt = %s,
            study_total_cnt = %s,
            study_type = 'PHONETICS',
            re_study_no = %s
        WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(task_update_query, (now_str, pass_count, total_count, re_study_no, task_id, user_id))

        # [단계 3] PHP 별점(Star Point) 자동 계산 로직 (SetStarPointSave 이식)
        # 3-1. 당일 전체 숙제 현황 조회
        sql_all_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date, re_study_no 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_tasks, (user_id, task_day))
        all_day_tasks = cursor.fetchall()
        
        total_day_cnt = len(all_day_tasks)
        today_complete_cnt = 0
        re_study_1_cnt = 0
        re_study_2_cnt = 0
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                if str(t['task_day']) == str(t['end_date']):
                    today_complete_cnt += 1
                if t['re_study_no'] >= 1: re_study_1_cnt += 1
                if t['re_study_no'] >= 2: re_study_2_cnt += 1

        # 3-2. 별점 점수 산정
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
                memo = "숙제 일부 완료"
            
            if re_study_1_cnt == total_day_cnt: star_cnt += 1; memo += " + 복습 1회"
            if re_study_2_cnt == total_day_cnt: star_cnt += 1; memo += " + 복습 2회"

            # 3-3. 별점 테이블 갱신 (기존 삭제 후 삽입)
            cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (user_id, task_day))
            sql_star_ins = "INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_star_ins, (user_id, task_day, star_cnt, memo))

        # [단계 4] 결과 상세 저장 (splucid_result_word)
        result_insert_query = """
        INSERT INTO splucid_result_word 
        (task_id, study_no, study_item_no, re_study_no, study_user_id, input_eng, input_eng_pass, input_save_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        input_eng = VALUES(input_eng),
        input_eng_pass = VALUES(input_eng_pass),
        input_save_date = VALUES(input_save_date)
        """
        for item in input_array:
            cursor.execute(result_insert_query, (
                task_id, item.get('study_no'), item.get('study_item_no'),
                re_study_no, user_id, item.get('input_eng', ''),
                item.get('input_eng_pass', 'N'), now_str
            ))
        
        connection.commit()
        return {
            'result_code': '200',
            'message': 'Results and Star Points saved successfully'
        }
        
    except Exception as e:
        if connection: connection.rollback()
        print(f"❌ Save error: {str(e)}")
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')
    finally:
        if cursor: cursor.close()
        if connection: connection.close()
                
@router.get('/results')
async def get_phonetics_results(
    task_id: int,
    user_id: str,
    re_study_no: int = 0
):
    """Phonetics 학습 결과 조회"""
    try:
        if not task_id or not user_id:
            raise HTTPException(status_code=400, detail='Missing required parameters')
        
        # Task 정보 가져오기
        task_query = """
        SELECT T1.*, T2.user_name
        FROM splucid_task T1
        JOIN splucid_user T2 ON T1.user_id = T2.user_id
        WHERE T1.task_id = %s AND T1.user_id = %s
        """
        task_info = execute_query(task_query, (task_id, user_id))
        
        if not task_info:
            raise HTTPException(status_code=404, detail='Task not found')
        
        task_info = task_info[0]
        study_no = task_info['study_no']
        
        # 결과 조회
        results_query = """
        SELECT T2.*, T1.input_eng, T1.input_eng_pass
        FROM splucid_result_word T1
        JOIN splucid_study_phonetics T2 ON T1.study_no = T2.study_no AND T1.study_item_no = T2.study_item_no
        WHERE T1.task_id = %s 
        AND T1.study_user_id = %s 
        AND T1.re_study_no = %s
        ORDER BY T1.study_item_no ASC
        """
        
        results = execute_query(results_query, (task_id, user_id, re_study_no))
        
        if not results:
            results = []
        
        # 통계 계산
        fail_count = sum(1 for result in results if result.get('input_eng_pass') == 'N')
        
        return {
            'result_code': '200',
            'message': 'Success',
            'task_info': task_info,
            'results': results,
            'fail_cnt': fail_count,
            're_study_no': re_study_no
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')

@router.get('/fail-list')
async def get_phonetics_fail_list(
    task_id: int,
    user_id: str,
    re_study_no: int = 0
):
    """Phonetics 오답 목록 조회 (재학습용)"""
    try:
        if not task_id or not user_id:
            raise HTTPException(status_code=400, detail='Missing required parameters')
        
        # Task 정보 가져오기
        task_query = """
        SELECT study_no FROM splucid_task 
        WHERE task_id = %s AND user_id = %s
        """
        task_result = execute_query(task_query, (task_id, user_id))
        
        if not task_result:
            raise HTTPException(status_code=404, detail='Task not found')
        
        study_no = task_result[0]['study_no']
        
        # 오답 목록 조회
        fail_query = """
        SELECT T2.*, T1.input_eng, T1.input_eng_pass, 
               T3.study_distractor, T3.study_answer,
               T4.study_step1_code, T4.study_step2_code
        FROM splucid_result_word T1
        JOIN splucid_study_phonetics T2 ON T1.study_no = T2.study_no AND T1.study_item_no = T2.study_item_no
        JOIN splucid_study_phonetics_quiz T3 ON T1.study_no = T3.study_no AND T1.study_item_no = T3.study_item_no
        JOIN splucid_study T4 ON T1.study_no = T4.study_no
        WHERE T1.task_id = %s 
        AND T1.study_user_id = %s 
        AND T1.input_eng_pass = 'N'
        AND T1.re_study_no = %s
        ORDER BY T1.study_item_no ASC
        """
        
        fail_list = execute_query(fail_query, (task_id, user_id, re_study_no))
        
        return {
            'result_code': '200',
            'message': 'Success',
            'fail_list': fail_list or []
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Server error: {str(e)}')
