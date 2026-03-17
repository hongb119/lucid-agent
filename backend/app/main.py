from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import speaking,video,smalltalk,patterndrill  # 이 라인이 에러가 나지 않도록 아래 파일을 먼저 만드세요

app = FastAPI(title="Lucid AI Speaking API")

# CORS 설정: 리액트 및 아파치 프록시 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(speaking.router, prefix="/api/speaking", tags=["Speaking"])
app.include_router(video.router, prefix="/api/video", tags=["Video"])
app.include_router(smalltalk.router, prefix="/api/smalltalk", tags=["SmallTalk"])
app.include_router(patterndrill.router, prefix="/api/patterndrill", tags=["PatternDrill"])


@app.get("/")
def root():
    return {"message": "Lucid Backend is running", "version": "2.0"}