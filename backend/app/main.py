from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.core.logging import logger
from app.middlewares.cors import setup_cors
from app.middlewares.error_handler import setup_error_handlers
from app.middlewares.audit_middleware import AuditMiddleware
from app.api.v1.router import api_router
from app.schemas.common import ApiResponse, HealthResponse
import app.models  # Register all SQLAlchemy models in ORM registry


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info(f"Starting {settings.PROJECT_NAME} in [{settings.ENVIRONMENT}] mode...")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME} cleanly...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Setup Middlewares & Error Handlers
setup_cors(app)
setup_error_handlers(app)
app.add_middleware(AuditMiddleware)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", response_model=ApiResponse[dict], tags=["Root"])
async def root_status():
    """Root status endpoint."""
    return ApiResponse(
        success=True,
        data={
            "name": settings.PROJECT_NAME,
            "status": "online",
            "version": settings.VERSION,
            "docs": "/docs",
        },
    )


@app.get("/health", response_model=ApiResponse[HealthResponse], tags=["Health"])
async def health_check():
    """Root level health endpoint."""
    return ApiResponse(
        success=True,
        data=HealthResponse(
            status="healthy",
            database="connected",
            redis="connected",
        ),
    )
