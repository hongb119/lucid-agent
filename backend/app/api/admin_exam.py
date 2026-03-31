import pdfplumber
import re
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.database import get_db

router = APIRouter()

# --- [도우미 함수] PDF에서 문제 데이터 추출 ---
def extract_exam_data_from_pdf(pdf_obj):
    sections = [] # {instruction, passage, questions: []} 구조로 임시 수집
    current_section = {"instruction": "", "passage": "", "questions": []}
    
    q_num_pattern = re.compile(r'^(\d+)\s+') 
    opt_pattern = re.compile(r'^([@☑]|[\(\[]?[A-D1-4][\.\)\]]|[ⓐ-ⓔ]|[①-⑤])\s*')
    inst_keywords = ["Read and", "다음을", "Listen and", "Choose", "Part", "Look at", "대화를", "보고"]

    for page in pdf_obj.pages:
        text = page.extract_text(layout=True, char_margin=2.0)
        if not text: continue
        
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line or len(line) < 1: continue

            # 1. 새로운 지시문(지문 시작) 감지
            if any(key in line for key in inst_keywords) and not q_num_pattern.match(line):
                # 기존 섹션에 문제가 있었다면 저장 리스트에 추가 후 초기화
                if current_section["questions"] or current_section["passage"]:
                    sections.append(current_section)
                current_section = {"instruction": line, "passage": "", "questions": []}
                continue

            # 2. 문제 번호 감지
            match = q_num_pattern.match(line)
            if match:
                q_num = int(match.group(1))
                q_text = re.sub(r'^\d+\s+', '', line).strip()
                current_section["questions"].append({
                    "q_number": q_num,
                    "question_text": q_text,
                    "options": []
                })
                continue

            # 3. 보기 감지
            opt_match = opt_pattern.match(line)
            if current_section["questions"] and opt_match:
                clean_opt = re.sub(r'^([@☑]|[\(\[]?[A-D1-4][\.\)\]]|[ⓐ-ⓔ]|[①-⑤])\s*', '', line).strip()
                current_section["questions"][-1]["options"].append(clean_opt)
                continue

            # 4. 그 외는 지문(Passage) 또는 문제의 연장선
            if current_section["questions"] and len(current_section["questions"][-1]["options"]) < 1:
                current_section["questions"][-1]["question_text"] += " " + line
            elif not q_num_pattern.match(line) and not opt_pattern.match(line):
                current_section["passage"] += line + " "

    if current_section["questions"]:
        sections.append(current_section)
    return sections

# --- [API] PDF 분석 및 1:N 저장 ---
@router.post("/save-exam-pdf")
async def admin_save_exam_pdf(level: str, category: str, pdf_file: UploadFile = File(...), db = Depends(get_db)):
    cursor = db.cursor()
    try:
        with pdfplumber.open(pdf_file.file) as pdf:
            parsed_sections = extract_exam_data_from_pdf(pdf)

        # 트랜잭션 시작
        for sec in parsed_sections:
            # 1. exam_contents 저장
            content_sql = """
                INSERT INTO exam_contents (level, category, instruction, content_body)
                VALUES (%s, %s, %s, %s)
            """
            cursor.execute(content_sql, (level, category, sec["instruction"], sec["passage"].strip()))
            content_id = cursor.lastrowid # 방금 생성된 지문 ID 획득

            # 2. 해당 지문에 속한 문제들(exam_questions) 저장
            for q in sec["questions"]:
                opts = q["options"]
                while len(opts) < 4: opts.append(None)
                
                question_sql = """
                    INSERT INTO exam_questions (content_id, q_number, question_text, option_a, option_b, option_c, option_d)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(question_sql, (
                    content_id, q["q_number"], q["question_text"],
                    opts[0], opts[1], opts[2], opts[3]
                ))

        db.commit()
        return {"status": "success", "message": f"{len(parsed_sections)}개 지문 그룹 저장 완료"}
    except Exception as e:
        db.rollback()
        print(f"🔥 Save Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()