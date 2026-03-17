from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, categories

app = FastAPI(title="Lucid ItemBank API")

# CORS 설정 (프론트엔드 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 연결 (URL: /api/itembank/auth/login 등)
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Lucid ItemBank API is running"}