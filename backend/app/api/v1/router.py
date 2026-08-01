from fastapi import APIRouter
from app.api.v1.endpoints import health, version, auth, users, scans, audit_logs

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(version.router, tags=["Version"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(scans.router, prefix="/scans", tags=["Scans"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Logs"])
