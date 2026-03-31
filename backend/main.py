from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import importlib

# 로그 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lucid_logger")

app = FastAPI(title="Lucid AI System v3.9", version="3.9")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("\n" + "="*60)
print("🚀 LUCID BACKEND STARTUP - API PATH FIXED")
print("="*60)

def test_load(module_name, prefix, tags, sub_path="app.api"):
    """
    확인된 구조에 따라 app.api.파일명 형태로 모듈을 로드합니다.
    """
    try:
        # 실제 경로는 app.api.agent 등이 됩니다.
        full_path = f"{sub_path}.{module_name}"
            
        mod = importlib.import_module(full_path)
        
        if hasattr(mod, 'router'):
            app.include_router(mod.router, prefix=prefix, tags=tags)
            print(f"✅ [SUCCESS] {module_name.ljust(15)} -> {prefix}")
        else:
            print(f"❌ [FAILED ] {module_name.ljust(15)} -> 'router' 객체 없음")
            
    except ImportError as e:
        print(f"❌ [SKIP   ] {module_name.ljust(15)} -> 파일을 찾을 수 없음 ({e})")
    except Exception as e:
        print(f"❌ [ERROR  ] {module_name.ljust(15)} -> {e}")

# --- [전체 모듈 로드 리스트 - 확인된 파일명 기준] ---

# 1. AI 핵심 로직
test_load("agent", "/api/agent", ["Agent"])
test_load("ai_logic", "/api/chat", ["AIChat"])

# 2. 메인 학습 모듈
test_load("smalltalk", "/api/smalltalk", ["SmallTalk"])
test_load("phonetics", "/api/phonetics", ["Phonetics"])
test_load("speaking", "/api/speaking", ["Speaking"])
test_load("video", "/api/video", ["Video"])
test_load("patterndrill", "/api/patterndrill", ["PatternDrill"])
test_load("phonetics", "/api/phonetics", ["Phonetics"])

# 3. 보조 학습 모듈 (파일명에 study_ 가 붙은 것들 정확히 매칭)
test_load("study_voca", "/api/voca", ["Voca"])
test_load("study_dicta", "/api/dicta", ["Dictation"])
test_load("study_rsentence", "/api/rsentence", ["Review"])
# 5. 관리자 도구
test_load("admin_test", "/api/admin", ["AdminTools"])

# 4. 기타 서비스 (필요 시)
test_load("level_test", "/api/level_test", ["TestPlayer"])

print("="*60 + "\n")

@app.get("/")
def root():
    return {
        "status": "online", 
        "version": "3.9", 
        "message": "All modules in app/api are loaded!"
    }