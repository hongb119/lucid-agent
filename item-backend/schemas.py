from pydantic import BaseModel
from typing import List, Optional

class LoginRequest(BaseModel):
    name: str
    phone: str
    branchCode: str

class CategoryCreate(BaseModel):
    category_name: str
    parent_id: Optional[int] = None
    branch_code: str
    depth: int = 0