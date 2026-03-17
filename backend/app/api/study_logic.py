import sys
import os
from app.database import get_db, get_db_connection
# 루트 디렉토리(backend)를 파이썬 경로에 추가하여 database.py를 찾을 수 있게 함
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))



def get_unit_context(study_no: str):
    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        path_query = """
            SELECT c1.code_name as step1, c2.code_name as step2, s.study_unit 
            FROM splucid_study s
            LEFT JOIN splucid_study_code c1 ON s.study_step1_code = c1.code
            LEFT JOIN splucid_study_code c2 ON s.study_step2_code = c2.code
            WHERE s.study_no = %s
        """
        cursor.execute(path_query, (study_no,))
        p = cursor.fetchone()
        path_str = f"{p['step1']} > {p['step2']} > {p['study_unit']}" if p else "알 수 없는 유닛"

        cursor.execute("SELECT study_eng, study_kor FROM splucid_study_sentence WHERE study_no = %s", (study_no,))
        sentences = cursor.fetchall()
        cursor.execute("SELECT study_eng, study_kor FROM splucid_study_word WHERE study_no = %s", (study_no,))
        words = cursor.fetchall()

        return {"study_no": study_no, "path": path_str, "sentences": sentences, "words": words}
    finally:
        if connection: connection.close()

def get_automatic_context(user_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        # study_no 대신 실제 존재하는 video_id를 조회하거나, 
        # 최근 학습 맥락을 파악할 수 있는 다른 로직으로 대체
        sql = """
            SELECT video_id as study_no 
            FROM splucid_video_log 
            WHERE user_id = %s 
            ORDER BY last_watch_date DESC 
            LIMIT 1
        """
        cursor.execute(sql, (user_id,))
        result = cursor.fetchone()
        return result # {'study_no': 123} 형태 반환
    except Exception as e:
        print(f"Error in study_logic: {e}")
        return None
    finally:
        connection.close()