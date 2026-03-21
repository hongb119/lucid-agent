from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lucid_logger")

app = FastAPI(title="Lucid AI System v3.9", version="3.9")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("\n" + "="*60)
print("🚀 LUCID BACKEND STARTUP - FULL MODULE INTEGRATION")
print("="*60)

def test_load(module_name, prefix, tags, sub_path=None):
    try:
        # 경로 결정 (기본 app.api 또는 커스텀 경로)
        full_path = f"{sub_path}.{module_name}" if sub_path else f"app.api.{module_name}"
            
        mod = __import__(full_path, fromlist=['router'])
        
        if hasattr(mod, 'router'):
            app.include_router(mod.router, prefix=prefix, tags=tags)
            print(f"✅ [SUCCESS] {module_name.ljust(15)} -> {prefix}")
        else:
            print(f"❌ [FAILED ] {module_name.ljust(15)} -> 'router' 객체 없음")
            
    except ImportError as e:
        print(f"❌ [SKIP   ] {module_name.ljust(15)} -> 파일/이름 오류 ({e})")

# --- [전체 모듈 로드 리스트] ---

# 1. AI 핵심 로직 (에이전트, 채팅, 비전)
test_load("agent", "/api/agent", ["Agent"])
test_load("ai_logic", "/api/chat", ["AIChat"])
test_load("ai_service", "/api/vision", ["AIVision"], sub_path="app.services")

# 2. 메인 학습 모듈 (스몰토크, 파닉스, 스피킹 등)
test_load("smalltalk", "/api/smalltalk", ["SmallTalk"])  # 👈 스몰토크 추가!
test_load("phonetics", "/api/phonetics", ["Phonetics"])
test_load("speaking", "/api/speaking", ["Speaking"])
test_load("video", "/api/video", ["Video"])
test_load("patterndrill", "/api/patterndrill", ["PatternDrill"])

# 3. 보조 학습 모듈 (단어, 받아쓰기, 복습)
test_load("study_voca", "/api/voca", ["Voca"])
test_load("study_dicta", "/api/dicta", ["Dictation"])
test_load("study_rsentence", "/api/rsentence", ["Review"])

print("="*60 + "\n")

@app.get("/")
def root():
    return {
        "status": "online", 
        "version": "3.9", 
        "message": "All modules (including SmallTalk) are loaded!"
    }