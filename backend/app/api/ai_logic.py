import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# 1. FastAPI 라우터 설정
router = APIRouter()

# .env 로드 설정
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 데이터 모델 정의 ---
class ChatRequest(BaseModel):
    prompt: str

class ImageRequest(BaseModel):
    base64_image: str

class ContextChatRequest(BaseModel):
    question: str
    unit_data: dict

# --- 🚀 API 엔드포인트 등록 (누락된 부분 포함) ---

@router.post("/chat")
async def chat_with_luai(req: ChatRequest):
    """일반 채팅"""
    try:
        content = ask_agent_with_prompt(req.prompt)
        return {"answer": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat-with-context")
async def chat_with_context(req: ContextChatRequest):
    """학습 데이터를 참고한 맞춤형 채팅"""
    try:
        content = ask_agent_with_context(req.question, req.unit_data)
        return {"answer": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-image")
async def analyze_image(req: ImageRequest):
    """이미지 속 영어 분석"""
    try:
        content = analyze_image_text(req.base64_image)
        return {"analysis": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/recommend-word")
async def recommend_word():
    """오늘의 추천 단어 가져오기"""
    try:
        content = get_daily_recommended_word()
        return {"recommendation": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 🛠 핵심 로직 함수들 (기존 함수 유지 및 보강) ---

def get_daily_recommended_word():
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "초등학생용 유용한 영어 단어 1개 추천 (뜻, 예문 포함)."},
            {"role": "user", "content": "오늘의 추천 단어 알려줘."}
        ]
    )
    return response.choices[0].message.content

def generate_personalized_greeting(user_name: str = "학생"):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "다정한 AI 친구 '루아이'의 인사말."},
            {"role": "user", "content": f"내 이름은 {user_name}이야."}
        ]
    )
    return response.choices[0].message.content

def analyze_sentence_to_chunks(sentence: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "영어 문장을 의미 단위로 분석."},
            {"role": "user", "content": f"Analyze: {sentence}"}
        ]
    )
    return response.choices[0].message.content

def ask_agent_with_prompt(prompt: str):
    # [1. 일반 채팅 프롬프트 고도화] 단순 테스트/인사에 대한 장황함 방지
    SYSTEM_PROMPT = """
    너는 초등학생의 영어 공부를 도와주는 다정하고 발랄한 AI 친구 '루아이'야.
    [답변 규칙 - 필수 엄수]
    1. 기호 사용 금지: 마침표(.)를 제외한 모든 특수문자, 이모지, 괄호, 별표, 따옴표 등을 절대 사용하지 마.
    2. 언어 선택: 질문이 영어면 영어로, 한글이면 한글로 대답하되 아주 짧게 대답해.
    3. 인사/단순 확인: '안녕', '테스트' 등에는 반드시 딱 1문장으로만 답해. (예: 응 아주 잘 들려 공부 시작해볼까)
    4. 영어 공부 질문: 칭찬 1문장과 핵심 답변 1문장으로, 총 2문장 이내로 끝내.
    5. 어조: 초등학생 친구처럼 높고 밝은 톤으로 다정하게 말해줘.
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        max_tokens=100 # 답변 길이 강제 제한
    )
    return response.choices[0].message.content


def ask_agent_with_context(question: str, unit_data: dict):
    context_info = f"학습정보: {unit_data}" if unit_data else "일반 질문"
    prompt = f"컨텍스트: {context_info}\n질문: {question}"
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "학습 기반 다정한 영어 튜터입니다."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def analyze_image_text(base64_image: str):
    # [2. OCR 프롬프트 고도화] 그림 설명 대신 '영어 교육'에 집중
    SYSTEM_PROMPT = """
    너는 사진 속 영어를 찾아 가르쳐주는 영어 선생님 루아이야.
    [분석 규칙 - 필수 엄수]
    1. 기호 사용 금지: 마침표(.)와 물음표(?)를 제외한 모든 특수문자, 괄호, 따옴표 등을 사용하지 마. 
    2. 구성: [배경설명 1문장] + [영어단어/문장과 뜻/발음 설명] + [격려 1문장] 구조로 딱 3문장만 말해.
    3. 발음 안내: 영어 발음은 한글로 적지 말고, 영어 문장을 한 번 더 강조해서 말해줘.
    4. 예시: 사진 속에 사과가 있네. Apple은 사과라는 뜻이야. 이 문장을 같이 읽어볼까?
    5. 그림 설명보다는 사진 속 '영어 텍스트'를 찾아내어 가르치는 데 집중해.
    """
    
    try:
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
        base64_image = base64_image.replace("\n", "").replace("\r", "").strip()

        response = client.chat.completions.create(
            model="gpt-4o", # OCR은 gpt-4o가 훨씬 정확합니다.
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": "이 사진 속에 있는 영어 단어나 문장을 찾아서 초등학생에게 친절하게 가르쳐줘. 그림 설명보다는 영어 공부에 집중해줘."
                        },
                        {
                            "type": "image_url", 
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ],
                }
            ],
            max_tokens=300 # 교육용 답변이므로 약간의 여유를 둡니다.
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OCR 상세 에러: {e}")
        raise e