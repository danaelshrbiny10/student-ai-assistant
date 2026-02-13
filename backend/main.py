from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
from pathlib import Path
import uuid, os, shutil, datetime

import requests


app = FastAPI(title="Student Assistant API")

# ------------------ CORS ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Paths ------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # project root
FRONTEND_DIR = BASE_DIR / "frontend"

# ------------------ Uploads ------------------
UPLOAD_DIR = BASE_DIR / "uploaded_documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ------------------ Models ------------------
class Task(BaseModel):
    id: Optional[str]
    title: str
    description: Optional[str] = ""
    priority: int = 2
    category: Optional[str] = ""
    estimated_minutes: int = 30
    due_date: Optional[str] = None
    status: str = "pending"


class Habit(BaseModel):
    id: Optional[str]
    name: str
    description: Optional[str] = ""
    frequency: str = "daily"
    current_streak: int = 0
    longest_streak: int = 0
    total_completions: int = 0


class PlannerPreferences(BaseModel):
    wake_up_time: str = "08:00"
    sleep_time: str = "23:00"
    energy_pattern: str = "standard"


class PlannerRequest(BaseModel):
    preferences: PlannerPreferences


# ------------------ In-memory storage ------------------
tasks_db: List[Task] = []
habits_db: List[Habit] = []
documents_db: List[dict] = []


# ------------------ Health ------------------
@app.get("/health")
def health():
    return {"status": "ok"}


# ------------------ Guest Auth ------------------
@app.post("/auth/login")
def login_guest():
    return {"success": True, "user": {"name": "Guest", "id": "guest"}}


# ------------------ Tasks ------------------
@app.get("/tasks")
def get_tasks(status: Optional[str] = None):
    result = tasks_db
    if status:
        result = [t for t in tasks_db if t.status == status]
    return {"success": True, "tasks": result}


@app.get("/tasks/{task_id}")
def get_task(task_id: str):
    for t in tasks_db:
        if t.id == task_id:
            return {"success": True, "task": t}
    raise HTTPException(status_code=404, detail="Task not found")


@app.post("/tasks")
def create_task(task: Task):
    task.id = str(uuid.uuid4())
    tasks_db.append(task)
    return {"success": True, "task": task}


@app.put("/tasks/{task_id}")
def update_task(task_id: str, task: Task):
    for i, t in enumerate(tasks_db):
        if t.id == task_id:
            tasks_db[i] = task
            tasks_db[i].id = task_id
            return {"success": True, "task": task}
    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str):
    global tasks_db
    tasks_db = [t for t in tasks_db if t.id != task_id]
    return {"success": True}


# ------------------ Habits ------------------
@app.get("/habits")
def get_habits():
    return {"success": True, "habits": habits_db}


@app.post("/habits")
def create_habit(habit: Habit):
    habit.id = str(uuid.uuid4())
    habits_db.append(habit)
    return {"success": True, "habit": habit}


@app.put("/habits/{habit_id}")
def update_habit(habit_id: str, habit: Habit):
    for i, h in enumerate(habits_db):
        if h.id == habit_id:
            habits_db[i] = habit
            habits_db[i].id = habit_id
            return {"success": True, "habit": habit}
    raise HTTPException(status_code=404, detail="Habit not found")


@app.delete("/habits/{habit_id}")
def delete_habit(habit_id: str):
    global habits_db
    habits_db = [h for h in habits_db if h.id != habit_id]
    return {"success": True}


@app.post("/habits/{habit_id}/track")
def track_habit(habit_id: str):
    for habit in habits_db:
        if habit.id == habit_id:
            habit.current_streak += 1
            habit.total_completions += 1
            if habit.current_streak > habit.longest_streak:
                habit.longest_streak = habit.current_streak
            return {"success": True, "habit": habit}
    raise HTTPException(status_code=404, detail="Habit not found")


# ------------------ Documents ------------------
@app.get("/documents")
def list_documents():
    return {"success": True, "documents": documents_db}


@app.post("/documents/upload")
def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())
    filename = f"{doc_id}_{file.filename}"
    filepath = UPLOAD_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    doc = {
        "id": doc_id,
        "filename": file.filename,
        "title": file.filename,
        "file_type": file.filename.split(".")[-1],
        "file_size": os.path.getsize(filepath),
        "uploaded_at": datetime.datetime.utcnow().isoformat(),
    }
    documents_db.append(doc)
    return {"success": True, "document": doc}


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    global documents_db
    documents_db = [d for d in documents_db if d["id"] != doc_id]
    return {"success": True}


@app.get("/documents/{doc_id}/summarize")
def summarize_document(doc_id: str):
    doc = next((d for d in documents_db if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    summary = f"Summary of {doc['title']}: This is a demo summary."
    return {"success": True, "summary": summary}


@app.get("/documents/{doc_id}/quiz")
def generate_quiz(doc_id: str):
    doc = next((d for d in documents_db if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    questions = [
        {
            "question": "Demo question 1?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": 0,
            "explanation": "Demo explanation.",
        },
        {
            "question": "Demo question 2?",
            "options": ["True", "False"],
            "correct_answer": 1,
            "explanation": "Demo explanation.",
        },
    ]
    return {"success": True, "questions": questions}


# ------------------ Planner ------------------
@app.post("/planner/generate")
def generate_day_plan(request: PlannerRequest):
    wake_time = request.preferences.wake_up_time
    sleep_time = request.preferences.sleep_time
    plan = [
        {
            "start": wake_time,
            "end": "10:00",
            "activity": "Morning Study",
            "type": "study",
            "duration": 120,
        },
        {
            "start": "10:00",
            "end": "10:30",
            "activity": "Break",
            "type": "break",
            "duration": 30,
        },
        {
            "start": "10:30",
            "end": "12:30",
            "activity": "Project Work",
            "type": "study",
            "duration": 120,
        },
    ]
    return {"success": True, "plan": {"schedule": plan}}


@app.get("/planner/today")
def get_today_plan():
    plan = [
        {
            "start": "08:00",
            "end": "10:00",
            "activity": "Morning Study",
            "type": "study",
            "duration": 120,
        },
        {
            "start": "10:00",
            "end": "10:30",
            "activity": "Break",
            "type": "break",
            "duration": 30,
        },
    ]
    return {"success": True, "plan": {"schedule": plan}}


# ------------------ Dashboard ------------------
@app.get("/stats/dashboard")
def dashboard_stats():
    return {
        "success": True,
        "statistics": {
            "tasks": {
                "total": len(tasks_db),
                "completed": sum(1 for t in tasks_db if t.status == "completed"),
            },
            "documents": {"total": len(documents_db)},
            "study": {"total_hours": sum(t.estimated_minutes for t in tasks_db) / 60},
        },
        "recent_activity": {"tasks": tasks_db[-5:]},
    }


# ------------------ AI Chat ------------------

@app.post("/ai/ask")
def ai_chat(payload: dict):
    question = payload.get("question", "").strip()
    doc_id = payload.get("document_id")

    # Load the document text from uploaded files
    doc_text = ""
    doc_title = ""
    if doc_id:
        doc = next((d for d in documents_db if d["id"] == doc_id), None)
        if doc:
            doc_title = doc["title"]
            file_path = UPLOAD_DIR / f"{doc['id']}_{doc['filename']}"
            if file_path.exists():
                # For simple text-based docs
                try:
                    doc_text = file_path.read_text(encoding="utf-8")
                except:
                    doc_text = ""

    # Build the prompt
    if doc_text:
        prompt = f"""
Here is a document:
Title: {doc_title}
Content:
{doc_text}

User instruction: {question}

Answer based solely on the above document.
Respond concisely and clearly.
"""
    else:
        prompt = f"User instruction: {question}\nAnswer without document context."

    try:
        # Send to local Ollama generate endpoint
        res = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2", "prompt": prompt, "stream": False},
        )
        res.raise_for_status()
        response_json = res.json()
        answer_text = response_json.get("response", "").strip()
    except Exception as e:
        answer_text = f"Error contacting Ollama: {str(e)}"

    return {"success": True, "answer": answer_text}


# Mount frontend folder as / for direct file access
# /index.html, /style.css, /scripts.js
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
