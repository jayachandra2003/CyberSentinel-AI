# CyberSentinel AI 🛡️⚡

**Enterprise-Grade AI-Powered Defensive Cybersecurity Platform**

CyberSentinel AI is a production-ready, defensive web security platform designed exclusively for authorized domain security posture assessment, compliance checking, and vulnerability reporting.

> [!IMPORTANT]
> **Ethical & Legal Compliance Notice**: CyberSentinel AI is strictly designed for defensive security assessments on websites you own or have explicit, documented authorization to test. No offensive exploitation capabilities exist within this platform.

---

## 🚀 Key Architectural Highlights

- **Clean Architecture & SOLID**: Strict separation of concerns with domain entities, generic repository pattern, dependency injection, and abstract scanner interfaces.
- **Frontend Engine**: Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, and Lucide Icons.
- **Backend Core**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async Ready), Alembic, and PostgreSQL.
- **Modular Defensive Engine**: Interface-driven scanner framework (`engine`, `orchestrator`, `registry`, `interfaces`, `analyzers`, `shared`, `modules`).
- **Asynchronous Task Architecture**: Celery distributed task queue backed by Redis for scan orchestration and report generation.
- **Enterprise Observability**: Structured JSON logging, Prometheus metrics (`/metrics`), and OpenTelemetry trace context.
- **Containerization**: Multi-stage Dockerfiles and Docker Compose for seamless local and production orchestration.

---

## 📁 Repository Directory Structure

```text
CyberSentinel-AI/
├── .github/              # CI/CD Workflows (Lint, Test, Frontend, Backend, Security)
├── docs/                 # Enterprise documentation (Architecture, API, Setup, Deployment)
├── docker/               # Dockerfiles for Frontend, Backend, Celery & Redis configs
├── scripts/              # Automation scripts (Setup, DB seeding, service wait)
├── frontend/             # Next.js 15 App Router Frontend (Feature-based structure)
├── backend/              # Python FastAPI Backend (Clean Architecture & Repository Pattern)
├── docker-compose.yml    # Full-stack container orchestration
├── .editorconfig         # Code style standards
├── .gitignore            # Git exclusion definitions
└── LICENSE               # MIT License
```

---

## ⚡ Quickstart Guide

### Prerequisites
- Node.js >= 20.x
- Python >= 3.12
- Docker & Docker Compose

### Running with Docker Compose

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cybersentinel-ai.git
cd cybersentinel-ai

# 2. Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 3. Launch the full environment
docker-compose up -d --build
```

Access services:
- **Frontend Application**: `http://localhost:3000`
- **FastAPI API Gateway**: `http://localhost:8000`
- **Interactive Swagger API Specs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`
- **Prometheus Metrics**: `http://localhost:8000/metrics`

---

## 📜 Documentation Index

- [Architecture Guide](docs/ARCHITECTURE.md)
- [Installation Guide](docs/INSTALLATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Specifications](docs/API_SPECIFICATION.md)
- [Contribution Guidelines](docs/CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
