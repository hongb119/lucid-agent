from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# [1] 임포트 경로 확인: app.api 패키지 구조 유지
from app.api import (
    agent, speaking, patterndrill, smalltalk, 
    video, study_voca, study_dicta, study_rsentence
)

# .env 로드 (루트 폴더 기준)
load_dotenv()

app = FastAPI(title="Lucid Integrated AI System")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- [라우터 등록 영역] ---

# 1. Speaking & SmallTalk (현재 주력 모듈 활성화)
app.include_router(speaking.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(smalltalk.router, prefix="/api/smalltalk", tags=["SmallTalk"])
app.include_router(patterndrill.router, prefix="/api/patterndrill", tags=["PatternDrill"])
app.include_router(study_voca.router, prefix="/api/voca", tags=["Voca"])
app.include_router(study_dicta.router, prefix="/api/dicta", tags=["Dictation"])
app.include_router(study_rsentence.router, prefix="/api/rsentence", tags=["RSentence"])


# 3. 기타 에이전트 및 비디오 (필요시 주석 해제)
#app.include_router(agent.router, prefix="/api/agent", tags=["Agent"])
# app.include_router(video.router, prefix="/api/video", tags=["Video"])
# 

@app.get("/")
async def root():
    return {"message": "Lucid Backend is running - All Modules Ready"}