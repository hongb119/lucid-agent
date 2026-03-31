import pdfplumber
import re
from docx import Document
from io import BytesIO
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.database import get_db

router = APIRouter()

# --- [공통 정규식 설정] ---
Q_NUM_PATTERN = re.compile(r'^(\d+)\s+')
OPT_SPLIT_PATTERN = re.compile(r'([ⓐ-ⓔ]|[①-⑤])') # 한 줄에 여러 보기가 있을 때 분리
INST_KEYWORDS = ["Read and", "다음을", "Listen and", "Choose", "Part", "Look and", "Speak"]

# --- [Word 분석 함수] ---
def extract_exam_data_from_word(file_content):
    doc = Document(BytesIO(file_content))
    sections = []
    current_section = {"instruction": "", "passage": "", "questions": []}

    for para in doc.paragraphs:
        line = para.text.strip()
        if not line: continue

        # 1. 지시문 판단
        if any(key in line for key in INST_KEYWORDS) and not Q_NUM_PATTERN.match(line):
            if current_section["questions"] or current_section["passage"]:
                sections.append(current_section)
            current_section = {"instruction": line, "passage": "", "questions": []}
            continue

        # 2. 문제 번호 판단
        match = Q_NUM_PATTERN.match(line)
        if match:
            q_num = int(match.group(1))
            full_text = re.sub(r'^\d+\s+', '', line).strip()
            
            # 한 줄에 보기까지 포함된 경우 처리 (예: 1 D ⓐ m ⓑ g...)
            parts = OPT_SPLIT_PATTERN.split(full_text)
            q_text = parts[0].strip()
            options = []
            for i in range(1, len(parts), 2):
                if i+1 < len(parts): options.append(parts[i+1].strip())

            current_section["questions"].append({
                "q_number": q_num, "question_text": q_text, "options": options
            })
            continue

        # 3. 보기가 다음 줄에 나열된 경우 (ⓐ ⓑ ⓒ ⓓ)
        if current_section["questions"] and OPT_SPLIT_PATTERN.search(line):
            parts = OPT_SPLIT_PATTERN.split(line)
            for i in range(1, len(parts), 2):
                if i+1 < len(parts): 
                    current_section["questions"][-1]["options"].append(parts[i+1].strip())
            continue

        # 4. 그 외 지문 처리
        current_section["passage"] += line + " "

    if current_section["questions"] or current_section["passage"]:
        sections.append(current_section)
    return sections

# --- [PDF 분석 함수] ---
def extract_exam_data_from_pdf(pdf_obj):
    sections = []
    current_section = {"instruction": "", "passage": "", "questions": []}
    
    for page in pdf_obj.pages:
        text = page.extract_text(layout=True, char_margin=2.0)
        if not text: continue
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line: continue

            if any(key in line for key in INST_KEYWORDS) and not Q_NUM_PATTERN.match(line):
                if current_section["questions"] or current_section["passage"]: sections.append(current_section)
                current_section = {"instruction": line, "passage": "", "questions": []}
                continue

            match = Q_NUM_PATTERN.match(line)
            if match:
                q_num = int(match.group(1))
                q_text = re.sub(r'^\d+\s+', '', line).strip()
                current_section["questions"].append({"q_number": q_num, "question_text": q_text, "options": []})
                continue

            if OPT_SPLIT_PATTERN.search(line) and current_section["questions"]:
                parts = OPT_SPLIT_PATTERN.split(line)
                for i in range(1, len(parts), 2):
                    if i+1 < len(parts): current_section["questions"][-1]["options"].append(parts[i+1].strip())
                continue

            current_section["passage"] += line + " "

    if current_section["questions"]: sections.append(current_section)
    return sections

# --- [통합 엔드포인트: /parse-exam-file] ---
@router.post("/parse-exam-file")
async def admin_parse_file(
    level: str = Form(...), 
    category: str = Form("Reading"), 
    pdf_file: UploadFile = File(...), 
    db = Depends(get_db)
):
    cursor = db.cursor()
    filename = pdf_file.filename.lower()
    file_content = await pdf_file.read()

    try:
        # 1. 확장자에 따른 분석기 선택
        if filename.endswith('.docx'):
            parsed_sections = extract_exam_data_from_word(file_content)
        elif filename.endswith('.pdf'):
            with pdfplumber.open(BytesIO(file_content)) as pdf:
                parsed_sections = extract_exam_data_from_pdf(pdf)
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다. (.pdf, .docx 가능)")

        # 2. DB 저장 (1:N 구조)
        for sec in parsed_sections:
            content_sql = "INSERT INTO exam_contents (level, category, instruction, content_body) VALUES (%s, %s, %s, %s)"
            cursor.execute(content_sql, (level, category, sec["instruction"], sec["passage"].strip()))
            content_id = cursor.lastrowid 

            for q in sec["questions"]:
                opts = q["options"]
                while len(opts) < 4: opts.append(None)
                question_sql = """
                    INSERT INTO exam_questions (content_id, q_number, question_text, option_a, option_b, option_c, option_d)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(question_sql, (content_id, q["q_number"], q["question_text"], opts[0], opts[1], opts[2], opts[3]))

        db.commit()
        return {"status": "success", "sections": parsed_sections}
    except Exception as e:
        if db: db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()