from fastapi import FastAPI, Header, HTTPException
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship, Session
from database import Base, engine, get_db

# --- [Models] ---
class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True, index=True)
    branch_code = Column(String(20), nullable=False)
    parent_id = Column(Integer, ForeignKey("categories.category_id"), nullable=True)
    category_name = Column(String(100), nullable=False)
    depth = Column(Integer, default=0)
    
    # 자기 참조 관계 보정 (backref 대신 back_populates 권장)
    children = relationship("Category", cascade="all, delete-orphan")

# --- [Schemas & Logic] ---
def get_recursive_categories(db: Session, branch_code: str, parent_id: int = None):
    """재귀적으로 카테고리를 트리 구조로 변환"""
    categories = db.query(Category).filter(
        Category.branch_code == branch_code,
        Category.parent_id == parent_id
    ).all()
    
    return [
        {
            "category_id": cat.category_id,
            "category_name": cat.category_name,
            "depth": cat.depth,
            "children": get_recursive_categories(db, branch_code, cat.category_id)
        }
        for cat in categories
    ]

# --- [APIs] ---
@app.get("/api/categories/tree")
def read_category_tree(x_branch_code: str = Header(None), db: Session = Depends(get_db)):
    if not x_branch_code:
        raise HTTPException(status_code=400, detail="X-Branch-Code is required")
    return get_recursive_categories(db, x_branch_code)

@app.post("/api/categories")
def create_category(data: dict, x_branch_code: str = Header(None), db: Session = Depends(get_db)):
    # 신규 카테고리 추가 로직
    new_cat = Category(
        branch_code=x_branch_code,
        category_name=data['category_name'],
        parent_id=data.get('parent_id'),
        depth=data.get('depth', 0)
    )
    db.add(new_cat)
    db.commit()
    return {"message": "Success"}