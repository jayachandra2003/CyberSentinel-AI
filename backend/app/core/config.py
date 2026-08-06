import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CyberSentinel AI API Gateway"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "cybersentinel"
    POSTGRES_PASSWORD: str = "JChandra@2003"
    POSTGRES_DB: str = "cybersentinel_db"
    DATABASE_URL: str = (
        "postgresql+asyncpg://cybersentinel:JChandra%402003@localhost:5432/cybersentinel_db"
    )

    # Redis & Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Enterprise Scan Engine Settings (Phase 7)
    MAX_CONCURRENT_SCANS: int = 4
    SCAN_TIMEOUT: int = 180
    MODULE_TIMEOUT: int = 25
    MAX_RETRIES: int = 2
    MAX_BATCH_SIZE: int = 10
    MAX_QUEUE_SIZE: int = 100
    RETRY_BACKOFF_FACTOR: float = 1.5

    # Security & Enterprise Session JWT Configuration
    SECRET_KEY: str = "super-secret-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_HOURS: int = 24
    REMEMBER_DEVICE_DAYS: int = 30
    REVOKE_ALL_SESSIONS_ON_REPLAY: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3010",
        "http://127.0.0.1:3010",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                return json.loads(v)
            return [i.strip() for i in v.split(",")]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
