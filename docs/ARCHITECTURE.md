# CyberSentinel AI Architecture & Design Specification

## System Overview

CyberSentinel AI is an enterprise-grade defensive security assessment platform. The architecture strictly enforces Clean Architecture and SOLID principles, separating the API presentation layer, domain service logic, database persistence repositories, background worker orchestration, and modular security analyzer interfaces.

---

## 🏗 Layered Architecture Breakdown

```
       +-------------------------------------------------------+
       |             Next.js 15 App Router Frontend           |
       |    (TypeScript, Tailwind CSS, TanStack Query, Zod)   |
       +---------------------------+---------------------------+
                                   |
                                   | REST API / JSON Envelope
                                   v
       +-------------------------------------------------------+
       |                  FastAPI API Gateway                  |
       |       (Routing, Middleware, Rate Limiting, OpenAPI)    |
       +---------------------------+---------------------------+
                                   |
            +----------------------+----------------------+
            |                                             |
            v                                             v
+-----------------------+                     +-----------------------+
|  Security & Auth Context |                   | Audit & Log Middleware |
+-----------+-----------+                     +-----------+-----------+
            |                                             |
            +----------------------+----------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       |                 Domain Service Layer                  |
       |       (Business Validation, Scope Rules, RBAC)        |
       +---------------------------+---------------------------+
                                   |
            +----------------------+----------------------+
            |                                             |
            v                                             v
+-----------------------+                     +-----------------------+
| Repository Pattern    |                     | Celery Task Broker    |
| (SQLAlchemy 2.0 Async)|                     | (Redis Async Tasks)   |
+-----------+-----------+                     +-----------+-----------+
            |                                             |
            v                                             v
+-----------------------+                     +-----------------------+
| PostgreSQL / Supabase |                     | Scanner Engine &      |
| Database Engine       |                     | Modular Specs         |
+-----------------------+                     +-----------------------+
```

---

## 🔒 Defensive Scope & Ethical Guardrails

1. **Target Authorization Requirement**: Scans can only be triggered against domains registered under verified user accounts.
2. **Defensive Contract Interfaces**: The scanner framework (`backend/app/scanner/`) consists entirely of abstract contracts (`EngineInterface`, `ModuleInterface`, `AnalyzerInterface`).
3. **Audit Logging**: Every action (login attempt, permission check, scan dispatch) creates an immutable record in the `AuditLog` entity.

---

## 🧩 Database Domain Entities

1. `User`: Core authentication & RBAC identity.
2. `APIKey`: Hashed security key for API automation.
3. `ScanTarget`: Verified domain target.
4. `Scan`: Execution record tracking scan status, start/end timestamps.
5. `Vulnerability`: Normalized security finding schema.
6. `Report`: Generated report record metadata.
7. `AuditLog`: Immutable system security trail.
8. `Notification`: Platform alert notifications.

---

## ⚙️ Scanner Package Architecture

The scanner subsystem is structured into decoupled modules:
- `engine/`: Execution engine interface definitions.
- `orchestrator/`: Multi-module workflow manager contract.
- `registry/`: Dynamic module registration registry.
- `interfaces/`: Core abstract interfaces for engines, modules, and analyzers.
- `analyzers/`: Normalization pipeline interface.
- `shared/`: Shared scan context & target metadata schemas.
- `modules/`: Abstract placeholder modules (`ssl`, `headers`, `cookies`, `dns`, `tls`, `technologies`, `robots`, `sitemap`, `risk`).
