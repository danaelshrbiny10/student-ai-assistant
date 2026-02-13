- install requirements (cd backend, pip install -r requirements.txt)
- install ollama https://ollama.com/download
- update your key from .env file

- run server: 
ollama serve
ollama pull llama3.2
uvicorn backend.main:app --reload 

- backend endpoints in http://127.0.0.1:8000/docs, gui: http://127.0.0.1:8000/