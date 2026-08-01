# CyberSentinel AI Deployment Guide

This guide describes how to deploy CyberSentinel AI to cloud providers including **Vercel** (Frontend) and **Render / AWS / GCP / DigitalOcean** (Backend & Infrastructure).

---

## 🌐 1. Frontend Deployment (Vercel)

### Steps:
1. Connect your GitHub repository to Vercel.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Next.js**.
4. Configure Environment Variables in Vercel Dashboard:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://api.yourdomain.com/api/v1`
5. Click **Deploy**.

---

## 🐳 2. Backend & Worker Deployment (Render / Docker)

### Option A: Render.com Blueprint

Use the `render.yaml` or create two Render services:
1. **Web Service (FastAPI)**:
   - Environment: Docker
   - Dockerfile path: `docker/Dockerfile.backend`
   - Build Context: `.`
   - Env Vars: `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`
2. **Background Worker (Celery)**:
   - Environment: Docker
   - Dockerfile path: `docker/Dockerfile.celery`
   - Build Context: `.`

### Option B: Managed Kubernetes / Docker Swarm
Use the multi-stage Dockerfiles located in `docker/`:
- `docker/Dockerfile.backend`
- `docker/Dockerfile.frontend`
- `docker/Dockerfile.celery`

---

## 🔒 Production Security Checklist

- [ ] Change `SECRET_KEY` in environment config to a secure 64-character random string.
- [ ] Enable TLS/SSL certificates (HTTPS) for all domains.
- [ ] Enforce CORS origins restriction to trusted frontend domains.
- [ ] Use managed PostgreSQL (Supabase / AWS RDS) with SSL connections enabled.
