# CyberSentinel AI Installation Guide

This guide provides step-by-step instructions for setting up CyberSentinel AI locally for development or demonstration purposes.

---

## 📋 System Requirements

- **Operating System**: macOS, Linux, or Windows (WSL2 recommended)
- **Node.js**: >= 20.0.0
- **Python**: >= 3.12.0
- **Docker**: >= 24.0
- **Docker Compose**: >= 2.20

---

## 🚀 Option 1: Docker Compose Setup (Recommended)

```bash
# 1. Clone the project repository
git clone https://github.com/your-org/cybersentinel-ai.git
cd cybersentinel-ai

# 2. Setup environment variables
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Build and launch services
docker-compose up --build -d

# 4. Verify running containers
docker-compose ps
```

Services will be accessible at:
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

---

## 🛠 Option 2: Local Development Setup (Manual)

### 1. Database & Cache Infrastructure
Ensure PostgreSQL is running on port `5432` and Redis is running on port `6379`.

### 2. Backend Setup
```bash
cd backend

# Create Virtual Environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Run Migrations
alembic upgrade head

# Start FastAPI Application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install Dependencies
npm install

# Run Development Server
npm run dev
```

The Next.js application will be running on `http://localhost:3000`.
