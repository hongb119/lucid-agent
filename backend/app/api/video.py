from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from app.database import get_db, get_db_connection
from pydantic import BaseModel

router = APIRouter()

class VideoBase(BaseModel):
    video_id: int
    video_title: str
    video_type: Optional[str] = "LECTURE"
    file_path: Optional[str] = "" # None 허용을 위해 Optional 추가
    play_time: Optional[int] = 0
    thumbnail_path: Optional[str] = None

@router.get("/list", response_model=List[VideoBase])
def get_video_list(step1: str, step2: str, connection = Depends(get_db)):
    print(f"\n🚀 [백엔드] 무조건 조회 모드! step1: {step1}, step2: {step2}")
    
    cursor = connection.cursor(dictionary=True)
    
    # INNER JOIN을 LEFT JOIN으로 변경하여 파일 정보가 없어도 제목은 나오게 합니다.
    query = """
        SELECT 
            m.video_id, 
            m.video_title, 
            m.video_type, 
            IFNULL(f.file_path, '') as file_path, 
            IFNULL(f.play_time, 0) as play_time, 
            f.thumbnail_path
        FROM splucid_video_master m
        LEFT JOIN splucid_video_files f ON m.video_id = f.video_id
        WHERE m.use_yn = 'Y'
        LIMIT 100
    """
    
    try:
        cursor.execute(query) 
        rows = cursor.fetchall()
        
        print(f"✅ [백엔드] DB 조회 성공! 데이터 건수: {len(rows)}건")
        return rows
        
    except Exception as e:
        print(f"🔥 [백엔드 에러] 발생 원인: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cursor.close()