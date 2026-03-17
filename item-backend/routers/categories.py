from fastapi import APIRouter, Depends, Header, HTTPException
import schemas
from database import get_db


router = APIRouter(prefix="/categories", tags=["Categories"])

def fetch_recursive_tree(cursor, branch_code, parent_id=None):
    """DB 행 데이터를 트리 구조 JSON으로 변환하는 재귀 함수"""
    sql = "SELECT * FROM categories WHERE branch_code = %s AND "
    sql += "parent_id IS NULL" if parent_id is None else "parent_id = %s"
    
    params = (branch_code, parent_id) if parent_id is not None else (branch_code,)
    cursor.execute(sql, params)
    rows = cursor.fetchall()
    
    return [{
        "category_id": r['category_id'],
        "category_name": r['category_name'],
        "depth": r['depth'],
        "children": fetch_recursive_tree(cursor, branch_code, r['category_id'])
    } for r in rows]

@router.get("/tree")
async def get_category_tree(x_branch_code: str = Header(None), db = Depends(get_db)):
    if not x_branch_code:
        raise HTTPException(status_code=400, detail="X-Branch-Code header is missing")
    
    cursor = db.cursor(dictionary=True)
    try:
        return fetch_recursive_tree(cursor, x_branch_code)
    finally:
        cursor.close()

@router.post("/")
async def add_category(req: schemas.CategoryCreate, x_branch_code: str = Header(None), db = Depends(get_db)):
    cursor = db.cursor()
    try:
        sql = "INSERT INTO categories (branch_code, parent_id, category_name, depth) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, (x_branch_code, req.parent_id, req.category_name, req.depth))
        db.commit()
        return {"status": "success", "category_id": cursor.lastrowid}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()