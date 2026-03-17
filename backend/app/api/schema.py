from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.database import get_db


router = APIRouter()

# 1. 모든 테이블 목록 조회
@router.get("/tables")
async def list_all_tables(db = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SHOW TABLES")
        tables = [table[0] for table in cursor.fetchall()]
        return {"tables": tables}
    finally:
        cursor.close()

# 2. 특정 테이블 상세 스키마 조회
@router.get("/tables/{table_name}")
async def get_table_details(table_name: str, db = Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    try:
        # SQL Injection 방지를 위해 DESCRIBE 명령어만 사용
        cursor.execute(f"DESCRIBE {table_name}")
        columns = cursor.fetchall()
        
        if not columns:
            raise HTTPException(status_code=404, detail="테이블을 찾을 수 없습니다.")
            
        return {
            "table": table_name,
            "columns": columns
        }
    except Exception as e:
        print(f"❌ [Schema Error]: {str(e)}")
        raise HTTPException(status_code=400, detail="스키마 조회 중 오류 발생")
    finally:
        cursor.close()