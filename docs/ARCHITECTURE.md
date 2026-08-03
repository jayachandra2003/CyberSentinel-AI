# CyberSentinel AI — Architecture & Technical Specifications

## System Overview
CyberSentinel AI is built on a decoupled, asynchronous microservices-ready architecture:
- **Frontend**: Next.js 14 App Router, React, Tailwind CSS, TypeScript.
- **Backend**: FastAPI, Python 3.11+, AsyncIO, Pydantic v2.
- **Database**: PostgreSQL 17 storing JSONB `module_results`.

---

## Directory Structure

```text
CyberSentinel AI/
├── backend/
│   ├── app/
│   │   ├── api/                    # FastAPI route handlers (/api/v1/scans)
│   │   ├── core/                   # Security, config, database sessions
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── repositories/           # Database CRUD abstraction
│   │   └── scanner/
│   │       ├── interfaces/         # IScannerModule abstract interface
│   │       ├── modules/            # Scanner implementations
│   │       │   ├── dns/            # DNSScanner
│   │       │   ├── whois/          # WHOISScanner
│   │       │   ├── ssl/            # SSLScanner
│   │       │   ├── headers/        # HeadersScanner
│   │       │   └── cookies/        # CookieScanner
│   │       └── orchestrator/       # ScanOrchestrator pipeline engine
│   └── test_*.py                   # Module verification scripts
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   ├── components/                 # React UI components
│   │   └── scans/
│   │       ├── report/             # Report modal tabs (DnsTab, SslTab, CookiesTab, etc.)
│   │       └── ScanDetailModal.tsx # Master report container
│   └── services/api/               # Axios API client & TypeScript types (scanService.ts)
└── docs/                           # Official project documentation
```

---

## Backend Scanner Architecture

Every scanner engine implements the `IScannerModule` interface:

```python
class IScannerModule(ABC):
    @property
    @abstractmethod
    def module_id(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    async def run(self, target: str) -> Dict[str, Any]:
        pass
```

### Scan Pipeline Flow

```text
FastAPI Router (POST /api/v1/scans)
       │
       ▼
ScanOrchestrator.execute_scan_pipeline()
       │
       ├──► DNSScanner.run(target)
       ├──► WHOISScanner.run(target)
       ├──► SSLScanner.run(target)
       ├──► HeadersScanner.run(target)
       └──► CookieScanner.run(target)
                │
                ▼
ScanRepository.update_module_results() ──► PostgreSQL (scans.module_results)
                │
                ▼
Next.js Frontend ──► ScanDetailModal ──► Active Tabs (5 / 5 Modules Passed)
```

---

## Risk Engine & Scoring Formula

The overall security score (0–100) is calculated in `reportUtils.ts` by combining base deductions with module-specific risk scores:

$$\text{Overall Score} = \text{Math.round}\left(\frac{\text{BaseScore} + \text{WhoisScore} + (100 - \text{SslRisk}) + (100 - \text{HeadersRisk}) + (100 - \text{CookieRisk})}{\text{CompletedModules}}\right)$$

### Cookie Weighted Risk Formula
$$\text{Cookie Risk Score} = \min\left(100, \sum_{i=1}^{N} \text{Weight}_i \times \text{BaseDeduction}_i\right)$$
- **Authentication**: Weight 1.0
- **Session**: Weight 0.8
- **Tracking**: Weight 0.4
- **Analytics**: Weight 0.2
- **Functional**: Weight 0.1
- **Unknown**: Weight 0.5
