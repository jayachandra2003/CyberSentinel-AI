# CyberSentinel AI — Contributing & Development Guidelines

Welcome! This document defines the development workflow, coding standards, and quality verification requirements for contributing to CyberSentinel AI.

---

## 🔒 Frozen Baseline Policy
- **Stable Version**: `v1.6.0` is the frozen stable baseline.
- **Phased Workflow**: Every new feature or phase must follow the strict 9-step workflow:
  1. Understand requirements.
  2. Produce a detailed technical planning document in `docs/` or `implementation_plan.md`.
  3. Obtain explicit user approval.
  4. Implement only approved scope.
  5. Perform self-audit.
  6. List every modified file.
  7. Run verification commands locally.
  8. Report factual verification results.
  9. Wait for manual verification before git operations.

---

## 💻 Coding Standards

### Backend (Python / FastAPI)
- Use Python 3.11+ type hints (`from __future__ import annotations`).
- Use Pydantic v2 schemas for model validation.
- All network requests must use `httpx.AsyncClient` with default secure TLS verification (`verify=True`).
- **Forbidden**: `verify=False` or `# nosec` suppressions.
- Format with PEP 8 standards.

### Frontend (Next.js / TypeScript)
- Strict TypeScript (`npx tsc --noEmit` must pass with 0 errors).
- Zero ESLint warnings or errors (`npm run lint`).
- Use Vanilla CSS and Tailwind CSS following the project design system.
- Preserve dark theme compatibility.

---

## 🛠️ Local Verification Checklist

Before requesting review, execute and verify:

```powershell
# 1. Backend Security & Tests
cd backend
$env:PYTHONPATH="."; python test_cookie_scanner.py
pytest
bandit -r app -ll

# 2. Frontend Linter & Type Check
cd ../frontend
npm run lint
npx tsc --noEmit
npm run build
```

---

## 📌 Commit & Git Workflow
- **Branch Strategy**: Feature branches off `main`.
- **Commit Messages**: Conventional commits format (e.g. `feat(cookies): add weighted risk scoring`, `fix(headers): resolve report-only CSP false positive`).
- **Releases**: Tagged via semver `vX.Y.Z`.
