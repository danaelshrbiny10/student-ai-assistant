# Student AI Chat Assistant

A lightweight AI-powered assistant designed to help students with queries and learning tasks. Powered by LLaMA models via Ollama and served through a FastAPI backend.

## 🚀 Features

- AI chat interface for student queries

- FastAPI backend with auto-generated OpenAPI docs

- LLaMA model integration via Ollama

- Simple setup and deployment

## 💻 Installation

1. install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

2. Install Ollama

- Download and install Ollama from https://ollama.com/download

3. Update your API key

- Edit the `.env` file in the backend folder and add your Ollama API key:

```bash
OLLAMA_API_KEY=your_key_here
```

## ⚡ Running the Server

1. Start Ollama server

```bash
ollama serve
```

2. Pull the LLaMA model

```bash
ollama pull llama3.2
```

3. Start FastAPI backend

```bash
uvicorn backend.main:app --reload
```

## 🌐 Access

Backend API docs: http://127.0.0.1:8000/docs

Web GUI: http://127.0.0.1:8000/

## 🛠 Tech Stack

- Python 3.10+
- FastAPI
- Uvicorn
- Ollama / LLaMA 3.2

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
