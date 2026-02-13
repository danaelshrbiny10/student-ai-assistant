from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./app.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # required for SQLite
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# ---------------- USERS ----------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(150), unique=True, index=True)

    tasks = relationship("Task", back_populates="user")
    documents = relationship("Document", back_populates="user")


# ---------------- TASKS ----------------
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text)

    priority = Column(Integer, default=2)  # 1 low → 4 urgent
    status = Column(String(20), default="pending")

    due_date = Column(DateTime)
    completed_date = Column(DateTime)

    category = Column(String(50))
    estimated_minutes = Column(Integer)
    actual_minutes = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="tasks")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "completed_date": self.completed_date.isoformat() if self.completed_date else None,
            "category": self.category,
            "estimated_minutes": self.estimated_minutes,
            "actual_minutes": self.actual_minutes,
            "created_at": self.created_at.isoformat(),
        }


# ---------------- DOCUMENTS ----------------
class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    filename = Column(String(255))
    content = Column(Text)

    uploaded_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")


# ---------------- CREATE TABLES ----------------
def init_db():
    Base.metadata.create_all(bind=engine)
