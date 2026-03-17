from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Date, func, Enum
from app.database import Base 

# --- 1. 조직 및 권한 관리 (Organizations & Users) ---
class Organization(Base):
    __tablename__ = "organizations"
    org_id = Column(Integer, primary_key=True, index=True)
    org_name = Column(String(100), nullable=False)
    address = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    login_id = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    org_id = Column(Integer, default=0) # 지점코드
    
    # DB의 ENUM/Varchar 구조와 매칭
    user_type = Column(String(20), default="STUDENT") # HQ, ADMIN, TEACHER, STUDENT
    user_name = Column(String(50), nullable=False)
    
    phone_prefix = Column(String(3))
    phone_number = Column(String(15))
    email = Column(String(100))
    zipcode = Column(String(10))
    address_main = Column(Text)
    address_detail = Column(Text)
    
    use_middle_school_hall = Column(Boolean, default=False)
    admin_memo = Column(Text)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    user_status = Column(String(10), default="정회원")
    created_at = Column(DateTime, server_default=func.now())

# --- 2. 프로필 상세 (Profiles) ---
# 어제 생성한 1:1 상세 프로필 테이블들
class ProfileStudent(Base):
    __tablename__ = "profiles_student"
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    grade = Column(String(20))
    parent_phone = Column(String(20))
    status = Column(String(20), default="ACTIVE")

class ProfileTeacher(Base):
    __tablename__ = "profiles_teacher"
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    subject = Column(String(50))
    salary_type = Column(String(20))
    hire_date = Column(Date)

# --- 3. 반 및 수강 관리 (Classes) ---
class Class(Base):
    __tablename__ = "classes"
    class_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"))
    class_name = Column(String(100))
    teacher_id = Column(Integer, ForeignKey("users.user_id")) # 교사(User) 연결

class ClassEnrollment(Base):
    __tablename__ = "class_enrollments"
    enrollment_id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.class_id"))
    student_id = Column(Integer, ForeignKey("users.user_id")) # 학생(User) 연결

# --- 4. 커리큘럼 및 교재 (Curriculums) ---
class Curriculum(Base):
    __tablename__ = "curriculums"
    curri_id = Column(Integer, primary_key=True)
    name = Column(String(100))

class Level(Base):
    __tablename__ = "levels"
    level_id = Column(Integer, primary_key=True)
    curri_id = Column(Integer, ForeignKey("curriculums.curri_id"))
    level_name = Column(String(50))

class Unit(Base):
    __tablename__ = "units"
    unit_id = Column(Integer, primary_key=True)
    level_id = Column(Integer, ForeignKey("levels.level_id"))
    unit_name = Column(String(100))

class Textbook(Base):
    __tablename__ = "textbooks"
    book_id = Column(Integer, primary_key=True)
    title = Column(String(200))
    price = Column(Integer)
    stock = Column(Integer, default=0)

# --- 5. 숙제 및 학습 결과 (Homework) ---
class HomeworkAssignment(Base):
    __tablename__ = "homework_assignments"
    hw_id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.class_id"))
    title = Column(String(255))
    due_date = Column(DateTime)

class HomeworkResult(Base):
    __tablename__ = "homework_results"
    result_id = Column(Integer, primary_key=True)
    hw_id = Column(Integer, ForeignKey("homework_assignments.hw_id"))
    student_id = Column(Integer, ForeignKey("users.user_id")) # student_id -> users.user_id
    status = Column(String(20))
    score = Column(Integer)

# --- 6. 주문 및 소통 (Orders & Messages) ---
class BookOrder(Base):
    __tablename__ = "book_orders"
    order_id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.org_id"))
    order_title = Column(String(255))
    total_amount = Column(Integer)
    payment_status = Column(String(50))
    order_date = Column(DateTime, server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    msg_id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.user_id"))
    title = Column(String(255))
    content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

class StarPoint(Base):
    __tablename__ = "star_points"
    point_id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.user_id")) # student_id -> users.user_id
    amount = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())