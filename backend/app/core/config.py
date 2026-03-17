from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # DB 연결 설정
    DATABASE_URL: str
    
    # 보안 및 기타 설정
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 🔥 이 줄을 추가하세요! .env의 PROJECT_NAME을 받아줍니다.
    PROJECT_NAME: str = "Lucid Academy V2"

    class Config:
        env_file = ".env"
        # 만약 정의되지 않은 변수가 .env에 있어도 무시하고 싶다면 아래 설정을 추가할 수 있습니다.
        extra = "ignore" 

settings = Settings()