import os
import json
import re
import io
from typing import List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Body, Form, File, UploadFile
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
from app.database import get_db

# 1. 환경 설정
load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
router = APIRouter()

# --- 2. 데이터 모델 (프론트엔드 PatternDrill.jsx와 완벽 호환) ---
class DrillLog(BaseModel):
    study_item_no: int
    student_transcript: Optional[str] = ""
    unscramble_input: Optional[str] = ""
    is_speaking_correct: bool
    is_unscramble_correct: bool

class DrillCompleteRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: str
    re_study: str = "N"
    re_study_no: int = 0
    logs: List[DrillLog]

# [함수] 정문화 비교 (특수문자 제거 + 소문자화)
def normalize_for_comparison(text):
    if not text: return ""
    return re.sub(r'[^a-zA-Z0-9]', '', str(text).lower()).strip()

# --- 3. 엔드포인트 로직 ---

# [GET] 학습 정보 조회 (이게 성공해야 화면이 뜹니다)
@router.get("/info")
async def get_drill_info(task_id: int, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        # 1. 태스크 정보 조회
        sql_task = "SELECT study_no, study_step2_name, study_unit FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_task, (task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            return {"task_info": None, "content_list": [], "msg": "Task Not Found"}

        # 2. 문장 리스트 조회
        sql_content = """
            SELECT * FROM splucid_study_sentence 
            WHERE study_no = %s 
            ORDER BY study_item_no ASC
        """
        cursor.execute(sql_content, (task_info['study_no'],))
        content_list = cursor.fetchall()
        
        return {"task_info": task_info, "content_list": content_list}
    except Exception as e:
        print(f"🔥 Info Error: {str(e)}")
        # 500 에러 대신 에러 내용을 담아 응답하여 프론트 폭발 방지
        return {"error": str(e), "task_info": None, "content_list": []}
    finally:
        cursor.close()

# [POST] 언스크램블 정답 검증
@router.post("/check-unscramble")
async def check_unscramble(req: Any = Body(...), db = Depends(get_db)):
    cursor = db.cursor(dictionary=True, buffered=True)
    try:
        # 안전한 데이터 추출
        s_no = req.get("study_no") if isinstance(req, dict) else None
        item_no = req.get("study_item_no") if isinstance(req, dict) else None
        input_text = req.get("input_text", "") if isinstance(req, dict) else ""

        if not s_no or not item_no:
            return {"is_correct": False, "msg": "Required parameter missing"}

        sql = "SELECT study_eng, study_unscramble FROM splucid_study_sentence WHERE study_no = %s AND study_item_no = %s"
        cursor.execute(sql, (str(s_no), int(item_no)))
        result = cursor.fetchone()
        
        if not result:
            return {"is_correct": False, "msg": "No DB Data"}

        # 정답 비교 (unscramble 컬럼 우선)
        target_text = result.get('study_unscramble') or result.get('study_eng', "")
        is_correct = normalize_for_comparison(input_text) == normalize_for_comparison(target_text)
        
        return {"is_correct": is_correct, "target_original": target_text}
    except Exception as e:
        return {"is_correct": False, "error": str(e)}
    finally:
        cursor.close()

# [POST] 저장
@router.post("/complete")
async def complete_drill(payload: DrillCompleteRequest, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    now_full = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    try:
        # 1. 태스크 정보 조회
        sql_info = "SELECT user_id, task_day, study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_info, (payload.task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            return {"result_code": "404", "message": "Task not found"}

        user_id = task_info['user_id']
        study_no = task_info['study_no']
        target_day = task_info['task_day']

        # 2. 점수 계산 및 AI 총평 생성
        total = len(payload.logs)
        spk_score = int((sum(1 for l in payload.logs if l.is_speaking_correct) / total) * 100) if total > 0 else 0
        uns_score = int((sum(1 for l in payload.logs if l.is_unscramble_correct) / total) * 100) if total > 0 else 0

        try:
            gpt_res = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": f"발음 {spk_score}점, 어순 {uns_score}점인 학생에게 다정한 격려 2문장."}]
            )
            summary = gpt_res.choices[0].message.content.replace('"', '')
        except:
            summary = "오늘 학습도 수고 많았어요! 다음 시간에도 화이팅!"

        # 3. 숙제 테이블 업데이트
        sql_update = "UPDATE splucid_task SET task_status = 'Y', task_end_date = %s, study_pass_tcnt = %s, re_study_no = %s WHERE task_id = %s"
        cursor.execute(sql_update, (now_full, uns_score, payload.re_study_no, payload.task_id))

        # 4. AI 리포트 상세 저장 (JSON 로그 포함)
        logs_json = json.dumps([l.model_dump() for l in payload.logs], ensure_ascii=False)
        sql_report = """
            INSERT INTO splucid_ai_pattern_drill_report 
            (task_id, study_no, user_id, branch_code, speaking_score, unscramble_score, ai_summary_ko, detail_logs, reg_date) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_report, (
            payload.task_id, study_no, user_id, payload.branch_code, 
            spk_score, uns_score, summary, logs_json, now_full
        ))

        # ---------------------------------------------------------
        # 5. [핵심 추가] 별점(Star Point) 자동 계산 로직 (PHP SetStarPointSave 이식)
        # ---------------------------------------------------------
        sql_all_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_tasks, (user_id, target_day))
        all_day_tasks = cursor.fetchall()
        
        total_day_cnt = len(all_day_tasks)
        today_complete_cnt = 0 # 기간 내 완료
        actual_all_done = 0    # 상태 'Y' 전체
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                actual_all_done += 1
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

        # 별점 테이블 갱신 (기존 점수 삭제 후 최신화)
        cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (user_id, target_day))
        if star_cnt > 0:
            sql_star_ins = """
                INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) 
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(sql_star_ins, (user_id, target_day, star_cnt, star_memo))
        db.commit()
        return {"result_code": "200", "summary": summary, "star_cnt": star_cnt}
        
    except Exception as e:
        db.rollback()
        print(f"🔥 complete 에러: {str(e)}")
        return {"result_code": "500", "message": str(e)}
    finally:
        cursor.close()

# [POST] 스피킹 분석 (OpenAI Whisper 기반)
# [POST] 스피킹 분석 (Whisper STT) - 실서버 404 해결 및 안정화 버전
@router.post("/analyze-speaking")
async def analyze_speaking(
    task_id: int = Form(...),
    study_item_no: int = Form(...),
    user_id: str = Form(...),
    branch_code: str = Form(...),
    audio_file: UploadFile = File(...)
):
    try:
        # 파일 읽기 및 BytesIO 래핑 (실서버 안정성 확보)
        audio_content = await audio_file.read()
        audio_obj = io.BytesIO(audio_content)
        audio_obj.name = audio_file.filename 

        # OpenAI Whisper 호출
        transcript_res = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_obj,
            language="en"
        )
        
        student_text = transcript_res.text
        print(f"🎙 [Speaking] Task:{task_id} | User:{user_id} | Branch:{branch_code} | Result:{student_text}")

        return {
            "result_code": "200",
            "transcript": student_text,
            "user_id": user_id,
            "branch_code": branch_code
        }
    except Exception as e:
        print(f"🔥 Speaking Analysis Error: {str(e)}")
        return {"result_code": "500", "error": str(e)}