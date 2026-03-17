import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# 루트 디렉토리의 .env 파일을 찾아 로드합니다.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
# [도움 함수] 단순 프롬프트 실행용
def ask_agent_with_prompt(prompt: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "너는 초등학생의 다정한 AI 친구 '루아이'야. 1~2문장으로 아주 짧고 친절하게 한국어로 대답해."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

# 기능 1: 문장 청크 분리
def analyze_sentence_to_chunks(sentence: str):
    prompt = f"영어 문장을 의미 단위(Chunk)로 나누고 직독직해를 제공하세요. 문장: {sentence}"
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

# 기능 2: 학생 질문 답변 (교재 문맥 활용)
def ask_agent_with_context(question: str, unit_data: dict):
    context_info = "현재 특정 학습 정보가 없습니다. 일반적인 영어 질문에 답변해 주세요."
    if unit_data:
        context_info = f"""
        [학습 컨텍스트]
        단계: {unit_data.get('path')}
        문장: {unit_data.get('sentences')}
        단어: {unit_data.get('words')}
        """

    prompt = f"""
    당신은 '루시드 스마트러닝'의 친절한 AI 튜터 '루아이'입니다. 
    아래 [학습 컨텍스트]를 참고하여 [학생 질문]에 초등학생 눈높이로 다정하게 답하세요.
    {context_info}
    [학생 질문]: {question}
    """
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "다정한 영어 선생님 역할입니다. 한국어로 답변하되 영어 예문을 섞어주세요."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

# 기능 3: OCR 이미지 분석
def analyze_image_text(base64_image: str):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "이 사진 속 영어를 읽고 해석해줘. 초등학생에게 설명하듯 다정하게 말해줘."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ],
            }
        ]
    )
    return response.choices[0].message.content

# [기능 4] 개인화된 환영 인사 생성 (이름 포함 핵심!)
def generate_personalized_greeting(context):
    name = context.get('name', '친구')
    book = context.get('book', '교재')
    status = context.get('status', 'Y') 
    
    # 💡 GPT 호출 없이 즉시 문장 생성 (로딩 속도 0초)
    if status == 'N':
        return f"안녕 {name}! 지난번에 '{book}' 하던 거 마저 해볼까? 화이팅!"
    else:
        return f"안녕 {name}! 오늘도 만나서 반가워. 같이 열공하자! 😊"

def get_daily_recommended_word(user_context: dict):
    # 학생의 현재 교재 단계를 바탕으로 추천 단어 선정
    level = user_context.get('book', 'Basic English')
    
    prompt = f"""
    당신은 루시드 어학원의 AI 튜터입니다. 
    현재 '{level}' 수준을 공부하는 학생에게 오늘 꼭 알려주고 싶은 영어 단어 1개를 선정하세요.
    - 구성: 단어, 발음, 뜻, 그리고 아주 쉬운 예문 1개
    - 형식: JSON으로 반환
    {{ "word": "...", "phonetic": "...", "mean": "...", "example": "..." }}
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)