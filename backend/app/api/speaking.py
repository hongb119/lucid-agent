import os
import uuid
import json
import io
import shutil
from typing import List, Optional
from pathlib import Path
import datetime
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile, Body, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import openai
from dotenv import load_dotenv
from app.database import get_db

# [1] 환경 설정 및 OpenAI 초기화
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()

# --- [데이터 모델] ---
class SentenceResult(BaseModel):
    study_eng: str
    transcribed: str

class SummaryRequest(BaseModel):
    results: List[SentenceResult]

class ReportDetail(BaseModel):
    study_eng: str
    transcribed: str

class ReportSaveRequest(BaseModel):
    task_id: int
    user_id: str
    branch_code: str
    accuracy: str
    wpm: int
    duration: str
    word_count: int
    score: int
    overall_feedback: str
    details: List[ReportDetail]

# 업로드 경로
UPLOAD_DIR = BASE_DIR / "uploads" / "speaking"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 1. [GET] 학습 정보 조회 (테스트 성공한 Query 방식으로 유지)
@router.get("/info")
async def get_speaking_info(task_id: int = Query(...), db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        print(f"🚩 [BACKEND] 요청 수신 task_id: {task_id}")

        # [검증됨] 과제 정보 조회
        sql_task = "SELECT study_step2_name, study_step3_name, study_part, study_unit, study_no FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_task, (task_id,))
        dayTaskView = cursor.fetchone()
        
        if not dayTaskView:
            print(f"❌ [BACKEND] 데이터 없음 ID: {task_id}")
            raise HTTPException(status_code=404, detail="DATA_NOT_FOUND")

        # [추가] 문장 리스트 조회
        s_no = str(dayTaskView['study_no']).strip()
        sql_sentences = "SELECT study_eng, study_mp3_file, study_item_no FROM splucid_study_sentence WHERE study_no = %s ORDER BY study_item_no ASC"
        cursor.execute(sql_sentences, (s_no,))
        studySentenceList = cursor.fetchall()

        return {
            "status": "success",
            "dayTaskView": dayTaskView,
            "studySentenceList": studySentenceList
        }
    except Exception as e:
        print(f"🔥 [BACKEND ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

# 2. [POST] 전체 통녹음 분석
# 2. [POST] 전체 통녹음 분석 (422 에러 방지를 위해 입구는 str로 통일)
# app/api/speaking.py 내의 해당 함수

@router.post("/ai-analysis-batch")
async def analyze_speaking_batch(
    user_code: str = Form(...),
    task_id: str = Form(...),
    branch_code: str = Form(...),
    target_sentences: str = Form(...), 
    audio_file: UploadFile = File(...),
    ):
    # [1] 업로드 폴더 생성
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # [2] 파일 저장
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    ext = audio_file.filename.split('.')[-1]
    file_name = f"{user_code}_{task_id}_{now_str}.{ext}"
    save_path = UPLOAD_DIR / file_name

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    try:
        # [3] Whisper AI: 실제 들린 내용만 텍스트로 추출
        with open(save_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", file=audio, language="en"
            )
        full_transcribed_text = transcript.text
        
        # [4] 정답 문장 리스트 파싱
        target_list = json.loads(target_sentences)

        # [5] ⭐ GPT 프롬프트 (환각 방지 및 정밀 매칭 강화)
        # 학생이 3문장만 말했으면 나머지 7문장은 비워두도록 강제함
        prompt = (
            f"### Role: Professional English Speech Evaluator\n"
            f"### Student's Actual Speech: '{full_transcribed_text}'\n"
            f"### Target Sentences (to follow): {target_list}\n\n"
            "--- Instructions ---\n"
            "1. Compare the 'Student's Actual Speech' with the 'Target Sentences' list in order.\n"
            "2. Identify which target sentences were actually spoken by the student.\n"
            "3. IMPORTANT: If a target sentence is NOT present in the student's actual speech, "
            "set 'transcribed' as an empty string (\"\") and 'score' to 0.\n"
            "4. DO NOT repeat the target sentence into 'transcribed' if the student didn't say it.\n"
            "5. Provide a JSON object: {'results': [{'study_eng':'', 'transcribed':'', 'score':0, 'feedback':''}]}"
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a strict evaluator. Only record what you actually hear in the student's speech."},
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        
        analysis_data = json.loads(response.choices[0].message.content)

        return {
            "status": "success",
            "full_text": full_transcribed_text,
            "analysis": analysis_data.get('results', [])
        }

    except Exception as e:
        print(f"❌ [AI 분석 에러]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류: {str(e)}")
    

# 3. [POST] 최종 총평 생성 (팩트 체크 강화 버전)
@router.post("/final-summary")
async def generate_final_summary(payload: SummaryRequest):
    try:
        # [1] 실제로 학생이 발화한 문장만 필터링 (환각 방지 핵심)
        spoken_results = [r for r in payload.results if r.transcribed.strip() != ""]
        
        if not spoken_results:
            return {"summary": "녹음된 문장이 없습니다. 마이크를 켜고 다시 도전해 보세요!"}
        
        # [2] 분석용 데이터 구성
        summary_data = "\n".join([f"원문: {r.study_eng} / 학생: {r.transcribed}" for r in spoken_results])
        count = len(spoken_results)

        # [3] GPT 프롬프트 수정
        prompt = (
            f"학생이 전체 문장 중 총 {count}문장을 학습했습니다.\n"
            f"학습 데이터:\n{summary_data}\n\n"
            "--- 지침 ---\n"
            "1. 위 '학습 데이터'에 있는 내용만 바탕으로 한국어 피드백을 작성해줘.\n"
            "2. 말하지 않은 문장에 대해서는 절대 언급하지 마.\n"
            "3. 구체적으로 잘한 단어나 발음이 있다면 칭찬하고, 개선점을 3문장 이내로 격려 섞어 작성해줘."
            "4. 특수문자나 이모지등 문자외의 특수문자는 쓰지말아줘."
            "5. 쌍따옴표나 어떤기호도 쓰지말아줘 읽는게 어색해지니깐"
        )
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a factual and encouraging English tutor."},
                {"role": "user", "content": prompt}
            ]
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# 4. [POST] 리포트 저장
# 4. [POST] 리포트 저장 (별점 연동 버전)
@router.post("/save-report")
async def save_final_report(payload: ReportSaveRequest, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True) # dictionary=True 추가로 데이터 접근 용이하게 설정
    
    try:
        # [단계 0] 해당 Task의 기본 정보(유저ID, 숙제날짜) 조회
        sql_info = "SELECT user_id, task_day FROM splucid_task WHERE task_id = %s"
        cursor.execute(sql_info, (payload.task_id,))
        task_info = cursor.fetchone()
        
        if not task_info:
            raise HTTPException(status_code=404, detail="TASK_NOT_FOUND")

        user_id = task_info['user_id']
        task_day = task_info['task_day']
        now_full = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 1. 스피킹 메인 리포트 저장
        sql_report = """
            INSERT INTO splucid_speaking_report 
            (task_id, user_id, branch_code, accuracy_grade, total_score, total_words, wpm, duration, overall_feedback, reg_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(sql_report, (
            payload.task_id, user_id, payload.branch_code,
            payload.accuracy, payload.score, payload.word_count,
            payload.wpm, payload.duration, payload.overall_feedback, now_full
        ))

        # 2. 문장별 상세 결과 저장
        sql_detail = "INSERT INTO splucid_speaking_detail (task_id, study_eng, transcribed_text) VALUES (%s, %s, %s)"
        detail_data = [(payload.task_id, d.study_eng, d.transcribed) for d in payload.details]
        cursor.executemany(sql_detail, detail_data)

        # 3. 과제 마스터 테이블(splucid_task) 업데이트 -> [핵심] 리스트 연동
        # 스피킹 점수(score)를 study_pass_tcnt 등에 활용할 수 있도록 업데이트
        sql_task_update = """
            UPDATE splucid_task 
            SET task_status = 'Y', 
                task_end_date = %s,
                speaking_accuracy = %s,
                speaking_wpm = %s
            WHERE task_id = %s AND user_id = %s
        """
        cursor.execute(sql_task_update, (now_full, payload.accuracy, payload.wpm, payload.task_id, user_id))

        # 4. PHP 별점(Star Point) 자동 계산 로직 이식 -> [핵심] 달력 별 연동
        # 4-1. 해당 날짜(task_day)의 유저 숙제 전체 리스트 재조회
        sql_all_day_tasks = """
            SELECT task_status, task_day, DATE(task_end_date) as end_date, re_study_no 
            FROM splucid_task 
            WHERE user_id = %s AND task_day = %s
        """
        cursor.execute(sql_all_day_tasks, (user_id, task_day))
        all_day_tasks = cursor.fetchall()
        
        total_day_cnt = len(all_day_tasks)
        today_complete_cnt = 0
        
        for t in all_day_tasks:
            if t['task_status'] == 'Y':
                # PHP 로직: 숙제날짜와 실제완료날짜가 같으면 '기간내 완료'
                if str(t['task_day']) == str(t['end_date']):
                    today_complete_cnt += 1

        # 4-2. 별점 점수 산정
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

            # 4-3. 별점 테이블 갱신 (기존 삭제 후 삽입)
            cursor.execute("DELETE FROM splucid_star_point WHERE user_id = %s AND study_day = %s", (user_id, task_day))
            sql_star_ins = "INSERT INTO splucid_star_point (user_id, study_day, star_cnt, memo) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_star_ins, (user_id, task_day, star_cnt, memo))

        db.commit()
        return {"result_code": "200", "result_msg": "스피킹 리포트 및 별점 저장 성공"}

    except Exception as e:
        db.rollback()
        print(f"🔥 [SAVE ERROR]: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

# 5. [POST] TTS (오타 수정 완료)
@router.post("/tts")
async def text_to_speech(payload: dict = Body(...)):
    try:
        response = client.audio.speech.create(
            model="tts-1", voice="shimmer", input=payload.get("text", "")
        )
        return StreamingResponse(io.BytesIO(response.content), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail="TTS 실패")