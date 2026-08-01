# CyberSentinel AI Development Guide

This document outlines development conventions, linting rules, code style guidelines, and testing protocols for CyberSentinel AI developers.

---

## 🎨 Enterprise Code Standards

### Strict Type Safety & Clean Code
- **Frontend**: Strict TypeScript configuration (`noImplicitAny`, `strictNullChecks`). No use of `any`.
- **Backend**: Python 3.12 type hints (`Pydantic v2` models, generic types, strict `mypy` compliance).

### Architectural Rules
1. **SOLID Principles**: Single responsibility modules, interface segregration, dependency inversion.
2. **Repository Pattern**: All database queries must pass through dedicated Repository classes (`backend/app/repositories/`). Direct database queries in API routes are strictly forbidden.
3. **Service Layer**: Business logic resides exclusively in Service classes (`backend/app/services/`).

---

## 🧪 Testing Guidelines

### Backend Testing Execution
```bash
cd backend

# Run all test suites
pytest

# Run unit tests only
pytest tests/unit

# Run API integration tests only
pytest tests/integration
```

### Frontend Type checking & Linting
```bash
cd frontend

# Run ESLint
npm run lint

# Run TypeScript compilation check
npx tsc --noEmit
```

---

## 🌿 Git & Branch Workflow

- `main`: Production-ready releases.
- `develop`: Staging integration branch.
- Feature Branches: `feature/short-description` or `fix/short-description`.
