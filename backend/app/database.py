import os
import mysql.connector
from mysql.connector import pooling
from fastapi import HTTPException
from dotenv import load_dotenv
from pathlib import Path

# 1. .env 파일 경로 설정 (database.py 위치 기준 상위 폴더의 .env)
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# 2. DB 접속 설정 (하드코딩 완전 제거 / os.getenv 사용)
db_config = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME"),
    "auth_plugin": "mysql_native_password"
}

db_pool = None

# 3. 커넥션 풀 초기화
try:
    # 환경변수를 제대로 못 읽었을 경우 대비
    if not db_config["host"] or not db_config["password"]:
        raise Exception(".env 파일에서 DB 정보를 불러오지 못했습니다. 경로를 확인하세요.")

    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="lucid_pool",
        pool_size=int(os.getenv("DB_POOL_SIZE", 10)), # 트래픽에 따라 .env에서 조절 가능
        **db_config
    )
    print(f"✅ Database Pool Initialized: {db_config['host']}")
    
except Exception as err:
    print(f"❌ DB Connection Error: {err}")

# 4. FastAPI용 의존성 주입 함수
def get_db():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    
    connection = db_pool.get_connection()
    try:
        yield connection
    finally:
        if connection.is_connected():
            connection.close()

# 4-2. [누락된 함수 추가] 일반 호출용 (return 방식)
def get_db_connection():
    """
    일반 로직이나 구형 코드에서 'connection = get_db_connection()'으로 
    직접 커넥션을 가져올 때 사용합니다.
    """
    if not db_pool:
        raise Exception("Database pool is not available.")
    return db_pool.get_connection()